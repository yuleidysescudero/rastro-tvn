"""pytest: las mismas pruebas T01–T10 que alimentan la matriz de Notion."""
import pytest

from rastro import aceptacion


@pytest.mark.parametrize("tid,fn", [(t[0], t[3]) for t in aceptacion.PRUEBAS])
def test_aceptacion(tid, fn):
    ok, evidencia = fn()
    assert ok, f"{tid}: {evidencia}"
