"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Sidebar, { type SidebarUser } from "../sidebar";

type Target = "cozinha" | "salao" | "copa";
type Priority = "normal" | "urgente";
type Status = "pendente" | "comprado" | "cancelado";
type ShoppingItem = {
  id: string;
  target: Target;
  name: string;
  quantity: number;
  unit: string;
  priority: Priority;
  note: string;
  status: Status;
  requestedBy: string;
  resolvedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
};
type Form = { target: Target; name: string; quantity: string; unit: string; priority: Priority; note: string };

const targetLabels: Record<Target, string> = { cozinha: "Cozinha", salao: "Salao", copa: "Copa" };
const emptyForm = (target: Target): Form => ({ target, name: "", quantity: "1", unit: "un", priority: "normal", note: "" });
const units = ["un", "kg", "g", "L", "ml", "cx", "pct", "fardo"];

function defaultTarget(user: SidebarUser | null): Target {
  if (user?.area === "salao") return "salao";
  if (user?.area === "copa") return "copa";
  return "cozinha";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function ShoppingListPage() {
  const [user, setUser] = useState<SidebarUser | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [activeTarget, setActiveTarget] = useState<Target>("cozinha");
  const [form, setForm] = useState<Form>(emptyForm("cozinha"));
  const [authError, setAuthError] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const isAdmin = user?.role === "admin" || user?.username?.toLowerCase() === "admin";

  async function refresh() {
    const response = await fetch("/api/shopping-list");
    if (response.ok) setItems(await response.json());
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.user) throw new Error("Nao autenticado");
        const target = defaultTarget(data.user);
        setUser(data.user);
        setActiveTarget(target);
        setForm(emptyForm(target));
        void refresh();
      })
      .catch((cause) => setAuthError(cause.message));
  }, []);

  const pending = useMemo(() => items.filter((item) => item.status === "pendente"), [items]);
  const completed = useMemo(() => items.filter((item) => item.status !== "pendente").slice(0, 24), [items]);
  const targetItems = pending.filter((item) => item.target === activeTarget);
  const counts = {
    cozinha: pending.filter((item) => item.target === "cozinha").length,
    salao: pending.filter((item) => item.target === "salao").length,
    copa: pending.filter((item) => item.target === "copa").length,
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setActionError("");
    const response = await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, quantity: Number(form.quantity.replace(",", ".")) }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setActionError(result.error);
    setForm(emptyForm(form.target));
    void refresh();
  }

  async function updateStatus(item: ShoppingItem, status: Exclude<Status, "pendente">) {
    setActionError("");
    const response = await fetch("/api/shopping-list", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status }),
    });
    const result = await response.json();
    if (!response.ok) return setActionError(result.error);
    void refresh();
  }

  function selectTarget(target: Target) {
    setActiveTarget(target);
    setForm((current) => ({ ...current, target }));
  }

  if (authError) return <main className="grid min-h-screen place-items-center bg-slate-100 p-5"><div className="rounded-2xl bg-white p-8 text-center shadow"><h1 className="text-xl font-black">Acesso restrito</h1><p className="mt-2 text-slate-500">{authError}</p><a className="mt-5 inline-block cursor-pointer rounded-xl bg-orange-500 px-4 py-2 font-bold text-white" href="/">Voltar</a></div></main>;
  if (!user) return <main className="grid min-h-screen place-items-center bg-slate-100 text-slate-500">Carregando lista...</main>;

  return <main className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
    <Sidebar user={user} />
    <section className="min-w-0 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-500">Compras</p>
            <h1 className="text-3xl font-black sm:text-4xl">Lista de compras</h1>
            <p className="text-slate-500">Solicitacoes separadas por Cozinha, Salao e Copa.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(["cozinha", "salao", "copa"] as Target[]).map((target) => <div key={target} className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm"><strong className="block text-2xl font-black">{counts[target]}</strong><span className="text-xs font-bold text-slate-500">{targetLabels[target]}</span></div>)}
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <form className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={save}>
            <h2 className="mb-4 text-xl font-black">Adicionar item</h2>
            <label className="mb-3 block text-sm font-bold text-slate-600">Lista
              <select className="mt-1 w-full" value={form.target} onChange={(event) => selectTarget(event.target.value as Target)}>
                <option value="cozinha">Cozinha</option>
                <option value="salao">Salao</option>
                <option value="copa">Copa</option>
              </select>
            </label>
            <label className="mb-3 block text-sm font-bold text-slate-600">Item
              <input className="mt-1 w-full" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex: detergente, tomate, guardanapo" required />
            </label>
            <div className="mb-3 grid grid-cols-[1fr_110px] gap-3">
              <label className="block text-sm font-bold text-slate-600">Quantidade
                <input className="mt-1 w-full" inputMode="decimal" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required />
              </label>
              <label className="block text-sm font-bold text-slate-600">Unidade
                <select className="mt-1 w-full" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>
                  {units.map((unit) => <option key={unit}>{unit}</option>)}
                </select>
              </label>
            </div>
            <label className="mb-3 block text-sm font-bold text-slate-600">Prioridade
              <select className="mt-1 w-full" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}>
                <option value="normal">Normal</option>
                <option value="urgente">Urgente</option>
              </select>
            </label>
            <label className="mb-4 block text-sm font-bold text-slate-600">Observacao
              <textarea className="mt-1 min-h-20 w-full resize-none" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Marca, tamanho, motivo ou detalhe da compra" />
            </label>
            {actionError && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{actionError}</p>}
            <button className="w-full cursor-pointer rounded-xl bg-orange-500 px-4 py-3 font-black text-white transition hover:bg-orange-600 disabled:opacity-50" disabled={saving}>{saving ? "Salvando..." : "Adicionar na lista"}</button>
          </form>

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap gap-2">
              {(["cozinha", "salao", "copa"] as Target[]).map((target) => <button key={target} className={`rounded-xl px-4 py-2 text-sm font-black transition ${activeTarget === target ? "bg-orange-500 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`} type="button" onClick={() => selectTarget(target)}>{targetLabels[target]} ({counts[target]})</button>)}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-black">{targetLabels[activeTarget]}</h2>
                <p className="text-sm text-slate-500">{activeTarget === "cozinha" ? "Itens de preparo, estoque e cozinha." : "Itens de atendimento. Salao e Copa seguem o mesmo tipo de necessidade operacional."}</p>
              </div>
              {targetItems.length ? <div className="grid gap-3 lg:grid-cols-2">
                {targetItems.map((item) => <ShoppingCard key={item.id} item={item} isAdmin={Boolean(isAdmin)} onBuy={() => updateStatus(item, "comprado")} onCancel={() => updateStatus(item, "cancelado")} />)}
              </div> : <p className="rounded-xl bg-slate-50 py-10 text-center text-sm font-bold text-slate-400">Nenhum item pendente nesta lista.</p>}
            </section>

            {completed.length > 0 && <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-black">Historico recente</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Item</th><th className="pb-3">Lista</th><th className="pb-3">Status</th><th className="pb-3">Solicitado por</th><th className="pb-3 text-right">Data</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{completed.map((item) => <tr key={item.id}><td className="py-3 font-bold">{item.quantity} {item.unit} de {item.name}</td><td className="py-3">{targetLabels[item.target]}</td><td className={`py-3 font-black ${item.status === "comprado" ? "text-emerald-600" : "text-red-600"}`}>{item.status === "comprado" ? "Comprado" : "Cancelado"}</td><td className="py-3">{item.requestedBy}</td><td className="py-3 text-right">{formatDate(item.resolvedAt ?? item.createdAt)}</td></tr>)}</tbody>
                </table>
              </div>
            </section>}
          </div>
        </div>
      </div>
    </section>
  </main>;
}

function ShoppingCard({ item, isAdmin, onBuy, onCancel }: { item: ShoppingItem; isAdmin: boolean; onBuy: () => void; onCancel: () => void }) {
  return <article className={`rounded-xl border p-4 ${item.priority === "urgente" ? "border-red-200 bg-red-50" : "border-slate-100 bg-slate-50"}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <strong className="truncate text-lg font-black">{item.name}</strong>
          {item.priority === "urgente" && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black uppercase text-white">Urgente</span>}
        </div>
        <p className="text-sm font-bold text-slate-700">{item.quantity} {item.unit}</p>
        <p className="mt-1 text-xs text-slate-500">Solicitado por {item.requestedBy} em {formatDate(item.createdAt)}</p>
      </div>
      {isAdmin && <div className="flex shrink-0 gap-2">
        <button className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700" type="button" title="Marcar comprado" aria-label={`Marcar ${item.name} como comprado`} onClick={onBuy}><CheckIcon /></button>
        <button className="grid h-9 w-9 place-items-center rounded-lg bg-red-100 text-red-700 transition hover:bg-red-200" type="button" title="Cancelar item" aria-label={`Cancelar ${item.name}`} onClick={onCancel}><XIcon /></button>
      </div>}
    </div>
    {item.note && <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-600">{item.note}</p>}
  </article>;
}

function CheckIcon() {
  return <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>;
}

function XIcon() {
  return <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
}
