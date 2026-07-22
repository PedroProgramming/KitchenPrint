import type { Metadata } from "next";
import "./globals.css";
import "./occupied.css";
import "./scroll.css";
import "./auth.css";
import "./tailwind.css";

export const metadata: Metadata = { title: "KPrint", description: "Controle de mesas e pedidos" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
