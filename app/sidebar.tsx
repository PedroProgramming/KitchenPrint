"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import AdminForm from "./admin-form";

export type SidebarUser = { name: string; username?: string; role: "admin" | "garcom"; area: "salao" | "copa" | null };

const adminLinks = [
  { href: "/dashboard", icon: "G", label: "Gestao" },
];

export default function Sidebar({ user, onSignOut }: { user: SidebarUser; onSignOut?: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = user.role === "admin" || user.username?.toLowerCase() === "admin";

  async function signOut() {
    if (onSignOut) return onSignOut();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return <>
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3 py-2.5 text-white shadow-lg lg:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-500 text-base font-black">K</div>
        <div className="min-w-0"><strong className="block truncate text-sm">KPrint</strong><small className="block truncate text-[11px] text-slate-400">{user.role === "admin" ? "Administrador" : user.area === "copa" ? "Copa" : "Salao"}</small></div>
      </div>
      <button className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black" onClick={() => setMobileOpen(true)}>Menu</button>
    </div>

    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden">
      <button aria-label="Fechar menu" className="absolute inset-0 bg-slate-950/70" onClick={() => setMobileOpen(false)} />
      <aside className="absolute right-0 top-0 h-full w-[min(86vw,330px)] overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-5 text-white shadow-2xl">
        <MobileHeader user={user} onClose={() => setMobileOpen(false)} />
        <UserBox user={user} onSignOut={signOut} />
        <Navigation isAdmin={isAdmin} pathname={pathname} />
        {isAdmin && <AdminBox />}
      </aside>
    </div>}

    <aside className="relative z-10 hidden overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-5 text-white shadow-2xl lg:sticky lg:top-0 lg:block lg:h-screen lg:w-[250px] lg:px-5 lg:py-7">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="relative flex items-center gap-3 px-2"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500 text-xl font-black shadow-lg shadow-orange-500/20">K</div><div><div className="text-2xl font-black tracking-tighter">K<span className="text-orange-400">Print</span></div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Gestao de pedidos</p></div></div>
      <UserBox user={user} onSignOut={signOut} />
      <Navigation isAdmin={isAdmin} pathname={pathname} />
      {isAdmin && <AdminBox />}
      <div className="relative mt-6 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-xs text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /><span><strong className="block text-[11px]">Impressora ativa</strong><small className="text-emerald-300/70">Aguardando pedidos</small></span></div>
    </aside>
  </>;
}

function MobileHeader({ user, onClose }: { user: SidebarUser; onClose: () => void }) {
  return <div className="mb-4 flex items-center justify-between">
    <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500 font-black">K</div><div className="min-w-0"><strong className="block truncate">KPrint</strong><small className="block truncate text-xs text-slate-400">{user.name}</small></div></div>
    <button className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black" onClick={onClose}>Fechar</button>
  </div>;
}

function UserBox({ user, onSignOut }: { user: SidebarUser; onSignOut: () => void }) {
  return <div className="relative mt-6 rounded-2xl border border-white/10 bg-white/[0.07] p-3">
    <div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/20 font-black text-orange-300">{user.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><strong className="block truncate text-sm">{user.name}</strong><small className="text-xs text-slate-400">{user.role === "admin" ? "Administrador" : `Garcom - ${user.area === "copa" ? "Copa" : "Salao"}`}</small></div></div>
    <button className="mt-3 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-red-500/15 hover:text-red-300" onClick={onSignOut}>Encerrar sessao</button>
  </div>;
}

function Navigation({ isAdmin, pathname }: { isAdmin: boolean; pathname: string }) {
  const isTables = pathname === "/";
  const isMenu = pathname.startsWith("/pratos");
  return <nav className="relative mt-6">
    <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Navegacao</p>
    <a className={`mb-2 flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-black transition ${isTables ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "border border-white/10 bg-white/5 text-slate-200 hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-200"}`} href="/"><span>M</span>Controle de Mesas</a>
    {isAdmin && <a className={`mb-2 flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-black transition ${isMenu ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "border border-white/10 bg-white/5 text-slate-200 hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-200"}`} href="/pratos"><span>P</span>Pratos e bebidas</a>}
    {isAdmin && <div className="mt-6 border-t border-white/10 pt-4">
      <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Gestao</p>
      {adminLinks.map((link) => {
        const active = pathname.startsWith(link.href);
        return <a key={link.href} className={`mb-2 flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-black transition ${active ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "border border-white/10 bg-white/5 text-slate-200 hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-200"}`} href={link.href}><span>{link.icon}</span>{link.label}</a>;
      })}
    </div>}
  </nav>;
}

function AdminBox() {
  return <div className="relative mt-6 rounded-2xl border border-orange-400/30 bg-orange-500/10 p-3"><p className="mb-3 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Administracao</p><AdminForm /></div>;
}
