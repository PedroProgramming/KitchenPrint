"use client";

import { useState } from "react";
import { type SidebarUser } from "./sidebar";

type NavItem = "dashboard" | "caixa" | "boletos" | "lancamentos" | "fechamentos";

const links = [
  { href: "/dashboard", label: "Visao geral", key: "dashboard" as NavItem },
  { href: "/caixa", label: "Caixa", key: "caixa" as NavItem },
  { href: "/boletos", label: "Boletos e contas", key: "boletos" as NavItem },
  { href: "/lancamentos", label: "Lancamentos", key: "lancamentos" as NavItem },
  { href: "/fechamentos", label: "Fechamentos", key: "fechamentos" as NavItem },
];

export default function DashboardSidebar({ user, active }: { user: SidebarUser; active: NavItem }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return <>
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm lg:hidden">
      <div className="min-w-0"><strong className="block truncate text-sm">KPrint Gestao</strong><small className="block truncate text-[11px] text-slate-500">{user.name}</small></div>
      <button className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black" onClick={() => setMobileOpen(true)}>Menu</button>
    </div>

    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden">
      <button aria-label="Fechar menu" className="absolute inset-0 bg-slate-950/60" onClick={() => setMobileOpen(false)} />
      <aside className="absolute right-0 top-0 h-full w-[min(86vw,330px)] overflow-y-auto bg-white px-4 py-5 text-slate-900 shadow-2xl">
        <SidebarContent user={user} active={active} onSignOut={signOut} onClose={() => setMobileOpen(false)} />
      </aside>
    </div>}

    <aside className="relative z-10 hidden overflow-y-auto border-r border-slate-200 bg-white px-5 py-7 text-slate-900 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-[250px]">
      <SidebarContent user={user} active={active} onSignOut={signOut} />
    </aside>
  </>;
}

function SidebarContent({ user, active, onSignOut, onClose }: { user: SidebarUser; active: NavItem; onSignOut: () => void; onClose?: () => void }) {
  return <>
    <div className="mb-6 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-2xl font-black tracking-tighter">K<span className="text-orange-500">Print</span></div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Dashboard</p>
      </div>
      {onClose && <button className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black" onClick={onClose}>Fechar</button>}
    </div>

    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <strong className="block truncate text-sm">{user.name}</strong>
      <small className="text-xs text-slate-500">Administrador</small>
      <button className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-red-50 hover:text-red-600" onClick={onSignOut}>Encerrar sessao</button>
    </div>

    <nav className="mt-6">
      <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Gestao</p>
      {links.map((link) => <a key={link.href} className={`mb-2 flex h-11 items-center rounded-xl px-3 text-sm font-black transition ${active === link.key ? "bg-orange-500 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`} href={link.href}>{link.label}</a>)}
    </nav>

    <div className="mt-6 border-t border-slate-200 pt-4">
      <a className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-600 transition hover:bg-white" href="/">Voltar para mesas</a>
    </div>
  </>;
}
