"use client";

import { type FormEvent, useEffect, useState } from "react";
import Sidebar, { type SidebarUser } from "../sidebar";

type MenuKind = "Prato" | "Bebida";
type MenuItem = { id: string; name: string; price: number; kind: MenuKind; active: boolean };
type DishForm = { name: string; price: string; kind: MenuKind };

const emptyDish = (kind: MenuKind = "Prato"): DishForm => ({ name: "", price: "", kind });
const formatPrice = (price: number) => price ? `R$ ${price.toFixed(2).replace(".", ",")}` : "A combinar";
const priceInput = (price: number) => price.toFixed(2).replace(".", ",");

export default function PratosPage() {
  const [user, setUser] = useState<SidebarUser | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [dish, setDish] = useState<DishForm>(emptyDish());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<MenuItem | null>(null);
  const [authError, setAuthError] = useState("");
  const [actionError, setActionError] = useState("");

  async function refresh() {
    const response = await fetch("/api/menu");
    if (response.ok) setMenu(await response.json());
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.user?.role !== "admin") throw new Error("Acesso negado");
        setUser(data.user);
        void refresh();
      })
      .catch((cause) => setAuthError(cause.message));
  }, []);

  function edit(item: MenuItem) {
    setActionError("");
    setEditingId(item.id);
    setDish({ name: item.name, price: priceInput(item.price), kind: item.kind });
  }

  function cancelEdit() {
    setActionError("");
    setEditingId(null);
    setDish(emptyDish(dish.kind));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setActionError("");
    const response = await fetch("/api/menu", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId ?? undefined,
        name: dish.name,
        kind: dish.kind,
        price: Number(dish.price.replace(",", ".")),
      }),
    });
    const result = await response.json();
    if (!response.ok) return setActionError(result.error);
    setEditingId(null);
    setDish(emptyDish(dish.kind));
    void refresh();
  }

  async function confirmRemoval() {
    if (!pendingRemoval) return;
    setActionError("");
    const item = pendingRemoval;
    const response = await fetch("/api/menu", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    const result = await response.json();
    if (!response.ok) return setActionError(result.error);
    if (editingId === item.id) cancelEdit();
    setPendingRemoval(null);
    void refresh();
  }

  if (authError) return <main className="grid min-h-screen place-items-center bg-slate-100 p-5"><div className="rounded-2xl bg-white p-8 text-center shadow"><h1 className="text-xl font-black">Acesso restrito</h1><p className="mt-2 text-slate-500">{authError}</p><a className="mt-5 inline-block cursor-pointer rounded-xl bg-orange-500 px-4 py-2 font-bold text-white" href="/">Voltar</a></div></main>;
  if (!user) return <main className="grid min-h-screen place-items-center bg-slate-100 text-slate-500">Carregando pratos...</main>;

  const dishes = menu.filter((item) => item.kind === "Prato");
  const drinks = menu.filter((item) => item.kind === "Bebida");

  return <main className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
    <Sidebar user={user} />
    <section className="min-w-0 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7">
          <p className="text-xs font-black uppercase tracking-widest text-orange-500">Administracao</p>
          <h1 className="text-3xl font-black sm:text-4xl">Pratos e bebidas</h1>
          <p className="text-slate-500">Organize os itens disponiveis para os pedidos.</p>
        </header>
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <form className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={save}>
            <h2 className="mb-4 text-xl font-black">{editingId ? "Editar item" : "Novo item"}</h2>
            <label>Tipo<select className="mt-1 w-full" value={dish.kind} onChange={(event) => setDish({ ...dish, kind: event.target.value as MenuKind })}><option>Prato</option><option>Bebida</option></select></label>
            <label>Nome<input className="mt-1 w-full" value={dish.name} onChange={(event) => setDish({ ...dish, name: event.target.value })} required /></label>
            <label>Preco<input className="mt-1 w-full" inputMode="decimal" placeholder="35,90" value={dish.price} onChange={(event) => setDish({ ...dish, price: event.target.value })} required /></label>
            {actionError && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{actionError}</p>}
            <button className="w-full cursor-pointer rounded-xl bg-orange-500 px-4 py-3 font-black text-white transition hover:bg-orange-600">{editingId ? "Salvar alteracoes" : "Cadastrar item"}</button>
            {editingId && <button className="mt-3 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-600 transition hover:bg-slate-50" type="button" onClick={cancelEdit}>Cancelar edicao</button>}
          </form>
          <div className="space-y-5">
            <Catalog title="Pratos" items={dishes} onEdit={edit} onRemove={setPendingRemoval} />
            <Catalog title="Bebidas" items={drinks} onEdit={edit} onRemove={setPendingRemoval} />
          </div>
        </div>
      </div>
    </section>
    {pendingRemoval && <RemoveModal item={pendingRemoval} onCancel={() => setPendingRemoval(null)} onConfirm={confirmRemoval} />}
  </main>;
}

function Catalog({ title, items, onEdit, onRemove }: { title: string; items: MenuItem[]; onEdit: (item: MenuItem) => void; onRemove: (item: MenuItem) => void }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="mb-4 text-xl font-black">{title} <span className="text-sm text-slate-400">({items.length})</span></h2>
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => <div key={item.id} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <div className="min-w-0">
          <span className="block truncate font-bold">{item.name}</span>
          <strong className="text-orange-600">{formatPrice(item.price)}</strong>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100" type="button" onClick={() => onEdit(item)} title="Editar item" aria-label={`Editar ${item.name}`}>
            <PencilIcon />
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100" type="button" onClick={() => onRemove(item)} title="Remover item" aria-label={`Remover ${item.name}`}>
            <TrashIcon />
          </button>
        </div>
      </div>)}
    </div>
  </section>;
}

function RemoveModal({ item, onCancel, onConfirm }: { item: MenuItem; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
    <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><TrashIcon /></span>
        <div>
          <h2 className="text-xl font-black">Remover item</h2>
          <p className="mt-1 text-sm text-slate-500">Remover "{item.name}" do cardapio?</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-600 transition hover:bg-slate-50" type="button" onClick={onCancel}>Cancelar</button>
        <button className="rounded-xl bg-red-600 px-4 py-3 font-black text-white transition hover:bg-red-700" type="button" onClick={onConfirm}>Remover</button>
      </div>
    </div>
  </div>;
}

function PencilIcon() {
  return <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24"><path d="m15.2 5.2 3.6 3.6" /><path d="M4 20h3.6L19.4 8.2a2.5 2.5 0 0 0-3.6-3.6L4 16.4V20Z" /></svg>;
}

function TrashIcon() {
  return <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5" /><path d="M14 11v5" /></svg>;
}
