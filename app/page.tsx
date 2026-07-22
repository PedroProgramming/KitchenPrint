"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import OrderPanel from "./order-panel";
import Sidebar from "./sidebar";

type Item = {
  id: string;
  name: string;
  kind: "Prato" | "Bebida";
  quantity: number;
  note: string;
  printedQuantity?: number;
};
type User = {
  id: string;
  name: string;
  username: string;
  role: "admin" | "garcom";
  area: "salao" | "copa" | null;
  tables: number[];
};
type Orders = Record<number, Item[]>;
type RestaurantTable = {
  id: string;
  number: number;
  name: string;
  area: "salao" | "copa";
  active: boolean;
};
type MenuItem = { id: string; name: string; price: number; kind: "Prato" | "Bebida"; active: boolean };

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Orders>({});
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selected, setSelected] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [login, setLogin] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  const persistedOrders = useRef<Orders>({});
  const available = tables.map((table) => table.number);
  const occupied = useMemo(
    () =>
      new Set(
        Object.keys(orders)
          .filter((key) => orders[Number(key)]?.length)
          .map(Number),
      ),
    [orders],
  );

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      });
  }, []);
  useEffect(() => {
    if (!user) return;
    fetch("/api/orders")
      .then((response) => response.json())
      .then((data) => {
        setOrders(data);
        persistedOrders.current = data;
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [user]);
  useEffect(() => {
    if (!user) return;
    fetch("/api/tables")
      .then((response) => response.json())
      .then((data) => setTables(Array.isArray(data) ? data : []));
  }, [user]);
  useEffect(() => {
    if (!user) return;
    fetch("/api/menu").then((response) => response.json()).then((data) => setMenu(Array.isArray(data) ? data : [])).catch(() => setMenu([]));
  }, [user]);
  useEffect(() => {
    if (!loaded) return;
    const keys = new Set([...Object.keys(persistedOrders.current), ...Object.keys(orders)]);
    const changed = [...keys].filter((key) => JSON.stringify(persistedOrders.current[Number(key)] ?? []) !== JSON.stringify(orders[Number(key)] ?? []));
    if (!changed.length) return;
    const payload = Object.fromEntries(changed.map((key) => [key, orders[Number(key)] ?? []]));
    for (const key of changed) persistedOrders.current[Number(key)] = orders[Number(key)] ?? [];
    void fetch("/api/orders", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  }, [orders, loaded]);
  useEffect(() => {
    if (available.length && !available.includes(selected))
      setSelected(available[0]);
  }, [available, selected]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(login),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error);
    setUser(data.user);
  }
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOrders({});
    setLoaded(false);
  }
  async function release() {
    if (user?.role !== "admin") return;
    const response = await fetch("/api/tables/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: selected }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "Não foi possível liberar a mesa." }));
      return alert(result.error);
    }
    persistedOrders.current[selected] = [];
    setOrders((current) => {
      const next = { ...current };
      delete next[selected];
      return next;
    });
  }
  async function print() {
    const items = (orders[selected] ?? [])
      .filter((item) => item.kind === "Prato")
      .flatMap((item) => {
        const pending = item.quantity - (item.printedQuantity ?? 0);
        return pending > 0 ? [{ ...item, quantity: pending }] : [];
      });
    if (!items.length || printing) return;
    setPrinting(true);
    try {
      const response = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: selected, items }),
      });
      if (!response.ok) throw new Error("Falha ao enviar pedido");
      const { jobId } = await response.json() as { jobId: string };
      let status = "pending";
      for (let attempt = 0; attempt < 30 && status !== "printed"; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const statusResponse = await fetch(`/api/print/status?id=${encodeURIComponent(jobId)}`);
        const job = await statusResponse.json() as { status?: string; error_message?: string };
        status = job.status ?? "error";
        if (status === "error") throw new Error(job.error_message || "A impressora recusou o pedido");
      }
      if (status !== "printed") throw new Error("A impressora ainda nao confirmou o pedido.");
      const printedIds = new Set(items.map((item) => item.id));
      setOrders((current) => ({
        ...current,
        [selected]: (current[selected] ?? []).map((item) =>
          printedIds.has(item.id) ? { ...item, printedQuantity: item.quantity } : item,
        ),
      }));
      alert("Pedido enviado para a cozinha.");
    } catch (cause) {
      alert(
        cause instanceof Error ? cause.message : "Nao foi possivel imprimir.",
      );
    } finally {
      setPrinting(false);
    }
  }

  if (!user)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-900 p-5">
        <form
          onSubmit={signIn}
          className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
        >
          <div className="mb-8 text-3xl font-black tracking-tighter">
            K<span className="text-orange-500">Print</span>
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-500">
            Acesso ao sistema
          </p>
          <h1 className="mt-1 text-4xl font-black">Entrar</h1>
          <p className="mb-6 text-slate-500">
            Use seu usuario e senha para continuar.
          </p>
          <label className="mb-3 block text-sm font-bold text-slate-600">
            Usuario
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              value={login.username}
              onChange={(event) =>
                setLogin({ ...login, username: event.target.value })
              }
            />
          </label>
          <label className="mb-3 block text-sm font-bold text-slate-600">
            Senha
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              type="password"
              value={login.password}
              onChange={(event) =>
                setLogin({ ...login, password: event.target.value })
              }
            />
          </label>
          {error && (
            <p className="mb-3 text-sm font-bold text-red-600">{error}</p>
          )}
          <button
            className="w-full rounded-xl bg-orange-500 py-3.5 font-black text-white"
            type="submit"
          >
            Entrar
          </button>
        </form>
      </main>
    );

  return (
    <main className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <Sidebar user={user} onSignOut={signOut} />
      {/*
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3 px-2">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500 text-xl font-black shadow-lg shadow-orange-500/20">K</div>
          <div><div className="text-2xl font-black tracking-tighter">K<span className="text-orange-400">Print</span></div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Gestão de pedidos</p></div>
        </div>
        <div className="relative mt-8 rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/20 font-black text-orange-300">{user.name.slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0"><strong className="block truncate text-sm">{user.name}</strong><small className="text-xs text-slate-400">{user.role === "admin" ? "Administrador" : `Garçom · ${user.area === "copa" ? "Copa" : "Salão"}`}</small></div>
          </div>
          <button className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-red-500/15 hover:text-red-300" onClick={signOut}>Encerrar sessão</button>
        </div>
        <div className="relative mt-6"><p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Navegação</p><div className="flex items-center gap-3 rounded-xl bg-orange-500 px-3 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20"><span className="grid h-6 w-6 place-items-center rounded-lg bg-white/20">⌂</span>Mesas e pedidos</div></div>
        {user.role === "admin" && <div className="relative mt-5 border-t border-white/10 pt-1"><p className="mb-1 mt-4 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Administração</p><AdminForm /></div>}
        <div className="relative mt-6 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-xs text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /><span><strong className="block text-[11px]">Impressora ativa</strong><small className="text-emerald-300/70">Aguardando pedidos</small></span></div>
      </aside> */}
      <section className="min-w-0 p-3 sm:p-5 lg:col-start-2 lg:p-8">
        <header className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-500">
              Operacao
            </p>
            <h1 className="text-3xl font-black sm:text-4xl">Mesas</h1>
            <p className="text-sm text-slate-500">
              {user.role === "admin"
                ? "Visao geral de todas as mesas."
                : `Area: ${user.area === "copa" ? "Copa" : "Salao"}`}
            </p>
          </div>
          <div className="text-right">
            <strong className="block text-3xl leading-none">
              {occupied.size}
            </strong>
            <span className="text-xs font-bold text-slate-500">ocupadas</span>
          </div>
        </header>
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-orange-50 p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 text-xl font-black">Mapa de mesas</h2>
            <div className="grid max-h-[calc(100vh-190px)] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-4">
              {available.map((table) => (
                <button
                  key={table}
                  className={`flex min-h-[82px] flex-col items-center justify-center rounded-xl border text-sm font-extrabold transition sm:min-h-[100px] ${selected === table ? "border-2 border-orange-600 bg-orange-100 shadow-lg" : occupied.has(table) ? "border-2 border-orange-400 bg-orange-200 text-orange-900" : "border-slate-200 bg-white"}`}
                  onClick={() => setSelected(table)}
                >
                  <span className="text-2xl font-black sm:text-3xl">
                    {table}
                  </span>
                  <span className="text-[11px]">
                    {occupied.has(table)
                      ? `${orders[table].length} item(ns)`
                      : "Livre"}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <OrderPanel
            table={selected}
            menu={menu}
            orders={orders}
            setOrders={setOrders}
            available={available.length > 0}
            canRelease={user.role === "admin"}
            onRelease={release}
            onPrint={print}
            printing={printing}
          />
        </div>
      </section>
    </main>
  );
}
