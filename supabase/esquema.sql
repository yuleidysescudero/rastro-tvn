-- RASTRO · esquema de Supabase (Postgres). Ejecutar una vez: scripts/supabase_setup.py o el SQL Editor.
-- Principio: registro de acciones humanas, solo inserción. Ningún rol puede editar ni borrar el historial
-- (trazabilidad pág. 5 y control humano pág. 8). El snapshot de datos públicos se carga en tablas de solo lectura.

-- ---------- Acciones humanas ----------
create table if not exists public.revisiones (
  id bigint generated always as identity primary key,
  id_evento text not null,
  estado text not null check (estado in ('nuevo','en revisión','requiere evidencia','aprobado como borrador','descartado')),
  persona text not null check (length(trim(persona)) > 0),
  rol text,
  nota text default '',
  reglas text default 'reglas-v1.1',
  usuario_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.bitacora (
  id bigint generated always as identity primary key,
  accion text not null,
  detalle jsonb default '{}'::jsonb,
  persona text not null,
  rol text,
  usuario_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.consultas (
  id bigint generated always as identity primary key,
  pregunta text not null check (length(pregunta) <= 500),
  tipo text,
  segundos real,
  origen text,
  persona text,
  usuario_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.etiquetas (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('tema','par','top5')),
  item_id text not null,
  valor text not null,
  persona text not null,
  usuario_id uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------- Snapshot público (lo carga scripts/supabase_setup.py con la service key) ----------
create table if not exists public.noticias (
  id_noticia text primary key, titulo text not null, url text, medio text, idioma text,
  fecha_ref timestamptz, fecha_tipo text, tema text, tema_baseline text, confianza_tema real,
  origen text, id_evento text, alcance_texto text
);
create table if not exists public.eventos (
  id_evento text primary key, rank int, titulo text, tema text, n_titulares int, n_procedencias int,
  puntaje real, nivel text, estado_evidencia text, motivo_evidencia text, componentes jsonb,
  primera_fecha timestamptz, ultima_fecha timestamptz, recirculacion text, conflictos jsonb, procedencias jsonb,
  reglas text
);
create table if not exists public.indicadores (
  pais_iso3 text, indicador_id text, indicador_nombre text, anio int, valor double precision,
  unidad text, fuente_url text, fecha_extraccion text, licencia text,
  primary key (pais_iso3, indicador_id, anio)
);

create index if not exists revisiones_evento on public.revisiones (id_evento, created_at);
create index if not exists etiquetas_item on public.etiquetas (tipo, item_id);

-- ---------- Seguridad a nivel de fila ----------
alter table public.revisiones enable row level security;
alter table public.bitacora enable row level security;
alter table public.consultas enable row level security;
alter table public.etiquetas enable row level security;
alter table public.noticias enable row level security;
alter table public.eventos enable row level security;
alter table public.indicadores enable row level security;

do $$
declare t text;
begin
  foreach t in array array['revisiones','bitacora','consultas','etiquetas'] loop
    execute format('drop policy if exists "leer autenticados" on public.%I', t);
    execute format('create policy "leer autenticados" on public.%I for select to authenticated using (true)', t);
    execute format('drop policy if exists "insertar propio" on public.%I', t);
    execute format('create policy "insertar propio" on public.%I for insert to authenticated with check (usuario_id = auth.uid())', t);
  end loop;
  foreach t in array array['noticias','eventos','indicadores'] loop
    execute format('drop policy if exists "lectura publica" on public.%I', t);
    execute format('create policy "lectura publica" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;
-- Sin políticas de UPDATE ni DELETE: el historial es inmutable para la app.

-- Estado vigente por caso (última revisión)
create or replace view public.estado_casos with (security_invoker = true) as
select distinct on (id_evento) id_evento, estado, persona, rol, nota, created_at
from public.revisiones order by id_evento, created_at desc;
