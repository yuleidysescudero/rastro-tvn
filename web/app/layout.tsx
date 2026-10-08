import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SesionProvider } from "@/lib/sesion";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "RASTRO · Copiloto editorial de evidencia", template: "%s · RASTRO" },
  description: "De la señal a la decisión: agenda priorizada, fichas de evidencia y borradores con citas para la mesa editorial.",
  icons: { icon: "/icono.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SesionProvider>{children}</SesionProvider>
      </body>
    </html>
  );
}
