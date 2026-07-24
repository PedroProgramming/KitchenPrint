"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar, { type SidebarUser } from "../sidebar";

type DishStats = { name: string; quantity: number; orders: number; tables: number };
type WaiterStats = { name: string; area: string; tables: number; dishes: number; averageMinutes: number };
type Stats = {
  totalTables: number;
  openTables: number;
  closedTables: number;
  totalDishes: number;
  uniqueDishes: number;
  dishOrders: number;
  averageMinutes: number;
  byWaiter: WaiterStats[];
  byDish: DishStats[];
};
type QuickFilter = "today" | "yesterday" | "7d" | "30d" | "month" | "custom";

const pad = (value: number) => String(value).padStart(2, "0");
const localDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const today = localDate(new Date());

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function rangeForFilter(filter: QuickFilter) {
  const now = new Date();
  if (filter === "yesterday") {
    const day = localDate(addDays(now, -1));
    return { from: day, to: day };
  }
  if (filter === "7d") return { from: localDate(addDays(now, -6)), to: today };
  if (filter === "30d") return { from: localDate(addDays(now, -29)), to: today };
  if (filter === "month") return { from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  return { from: today, to: today };
}

const quickFilters: { id: QuickFilter; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "month", label: "Mes atual" },
];

export default function Dashboard() {
  const [user, setUser] = useState<SidebarUser | null>(null);
  const [filter, setFilter] = useState<QuickFilter>("today");
  const [range, setRange] = useState(rangeForFilter("today"));
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.user?.role !== "admin") throw new Error("Acesso negado");
        setUser(data.user);
      })
      .catch((cause) => setError(cause.message));
  }, []);

  useEffect(() => {
    if (!user) return;
    setStats(null);
    fetch(`/api/dashboard?from=${range.from}&to=${range.to}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setStats(data);
      })
      .catch((cause) => setError(cause.message));
  }, [range, user]);

  const topDish = useMemo(() => stats?.byDish[0], [stats]);

  function applyQuickFilter(nextFilter: QuickFilter) {
    setFilter(nextFilter);
    setRange(rangeForFilter(nextFilter));
  }

  function updateCustomRange(nextRange: { from?: string; to?: string }) {
    setFilter("custom");
    setRange((current) => ({ from: nextRange.from ?? current.from, to: nextRange.to ?? current.to }));
  }

  if (error) return <main className="grid min-h-screen place-items-center bg-slate-100 p-5"><div className="rounded-2xl bg-white p-8 text-center shadow"><h1 className="text-xl font-black">Acesso restrito</h1><p className="mt-2 text-slate-500">{error}</p><a className="mt-5 inline-block cursor-pointer rounded-xl bg-orange-500 px-4 py-2 font-bold text-white" href="/">Voltar</a></div></main>;
  if (!user || !stats) return <main className="grid min-h-screen place-items-center bg-slate-100 text-slate-500">Carregando dashboard...</main>;

  return <main className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
    <Sidebar user={user} />
    <section className="min-w-0 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-500">Gestao</p>
            <h1 className="text-3xl font-black sm:text-4xl">Dashboard</h1>
            <p className="text-slate-500">Resumo dos atendimentos e pratos vendidos.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">Inicio<input className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" type="date" value={range.from} onChange={(event) => updateCustomRange({ from: event.target.value })} /></label>
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">Fim<input className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" type="date" value={range.to} onChange={(event) => updateCustomRange({ to: event.target.value })} /></label>
          </div>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          {quickFilters.map((option) => <button key={option.id} className={`rounded-xl px-4 py-2 text-sm font-black transition ${filter === option.id ? "bg-orange-500 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`} type="button" onClick={() => applyQuickFilter(option.id)}>{option.label}</button>)}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Card label="Mesas fechadas" value={stats.closedTables} />
          <Card label="Em atendimento" value={stats.openTables} accent />
          <Card label="Pratos servidos" value={stats.totalDishes} />
          <Card label="Pratos diferentes" value={stats.uniqueDishes} />
          <Card label="Lancamentos" value={stats.dishOrders} />
          <Card label="Tempo medio" value={`${stats.averageMinutes} min`} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Pratos mais pedidos</h2>
                <p className="text-sm text-slate-500">Quantidade total, vezes em que o prato entrou em pedido e mesas atendidas.</p>
              </div>
              {topDish && <div className="rounded-xl bg-orange-50 px-4 py-2 text-right"><p className="text-xs font-black uppercase tracking-wider text-orange-600">Mais vendido</p><strong className="text-sm">{topDish.name}</strong></div>}
            </div>
            {stats.byDish.length ? <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Prato</th><th className="pb-3 text-right">Quantidade</th><th className="pb-3 text-right">Vezes pedido</th><th className="pb-3 text-right">Mesas</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{stats.byDish.map((dish, index) => <tr key={dish.name}><td className="py-3"><span className="mr-3 inline-grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-xs font-black text-slate-500">{index + 1}</span><strong>{dish.name}</strong></td><td className="py-3 text-right text-lg font-black text-orange-600">{dish.quantity}</td><td className="py-3 text-right font-black text-slate-700">{dish.orders}</td><td className="py-3 text-right">{dish.tables}</td></tr>)}</tbody>
              </table>
            </div> : <p className="py-8 text-center text-slate-400">Nao ha pratos registrados neste periodo.</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-black">Atendimento por garcom</h2>
            {stats.byWaiter.length ? <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Usuario</th><th className="pb-3">Area</th><th className="pb-3 text-right">Mesas</th><th className="pb-3 text-right">Pratos</th><th className="pb-3 text-right">Tempo</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{stats.byWaiter.map((waiter) => <tr key={waiter.name}><td className="py-3 font-bold">{waiter.name}</td><td className="py-3">{waiter.area === "copa" ? "Copa" : "Salao"}</td><td className="py-3 text-right font-black text-slate-700">{waiter.tables}</td><td className="py-3 text-right font-black text-orange-600">{waiter.dishes}</td><td className="py-3 text-right">{waiter.averageMinutes} min</td></tr>)}</tbody>
              </table>
            </div> : <p className="py-8 text-center text-slate-400">Nao ha atendimentos registrados neste periodo.</p>}
          </section>
        </div>
      </div>
    </section>
  </main>;
}

function Card({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return <div className={`rounded-2xl border p-5 shadow-sm ${accent ? "border-orange-200 bg-orange-50" : "border-slate-200 bg-white"}`}><p className="text-sm font-bold text-slate-500">{label}</p><strong className="mt-2 block text-3xl font-black">{value}</strong></div>;
}
