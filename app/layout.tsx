import type { Metadata } from "next";
import "./globals.css";
import "./occupied.css";
import "./scroll.css";
import "./auth.css";
import "./tailwind.css";
import "./responsive.css";
import "./dark-theme.css";
import ThemeToggle from "./theme-toggle";

export const metadata: Metadata = { title: "KPrint", description: "Controle de mesas e pedidos" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning><body><script dangerouslySetInnerHTML={{ __html: `try { document.documentElement.classList.toggle("dark", localStorage.getItem("kprint-theme") === "dark"); } catch {}` }} />{children}<ThemeToggle /></body></html>;
}
