"use client";

import { useMemo, useState } from "react";
import { EntryTable, FinanceShell, SummaryCards, readJson, today, type EntryStatus, useFinanceSnapshot } from "../finance-common";

type StatusFilter = "pendente" | "vencido" | "todos";

export default function BoletosPage() {
  const { user, snapshot, error, refresh } = useFinanceSnapshot();
  const [status, setStatusFilter] = useState<StatusFilter>("pendente");
  const [category, setCategory] = useState("todos");
  const [search, setSearch] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [actionError, setActionError] = useState("");

  async function setStatus(id: string, nextStatus: EntryStatus) {
    setActionError("");
    const response = await fetch("/api/finance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "entry-status", id, status: nextStatus }) });
    const data = await readJson(response);
    if (!response.ok) return setActionError(data.error ?? "Nao foi possivel atualizar a conta.");
    await refresh();
  }

  async function createCategory() {
    setActionError("");
    const response = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "category", categoryName }) });
    const data = await readJson(response);
    if (!response.ok) return setActionError(data.error ?? "Nao foi possivel criar a categoria.");
    setCategoryName("");
    setCreatingCategory(false);
    await refresh();
  }

  const entries = useMemo(() => {
    const rows = (snapshot?.entries ?? []).filter((entry) => entry.type === "despesa" && entry.status !== "pago");
    const term = search.trim().toLowerCase();
    return rows.filter((entry) => {
      const matchesCategory = category === "todos" || entry.category === category;
      const date = entry.dueDate ?? entry.entryDate;
      const matchesStatus = status === "todos" || entry.status === status || (status === "vencido" && entry.status === "pendente" && date < today);
      const searchable = [entry.category, entry.description, entry.documentNumber, entry.documentNote, entry.proofImageName, entry.paymentMethod, entry.status, date].join(" ").toLowerCase();
      const matchesSearch = !term || searchable.includes(term);
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [category, search, snapshot, status]);

  return <FinanceShell user={user} error={error} loading={!snapshot} title="Boletos e contas" eyebrow="Controle de pagamentos" active="boletos">
    {snapshot && <div className="space-y-5">
      <SummaryCards snapshot={snapshot} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Filtros</h2>
            <p className="text-sm text-slate-500">Controle as contas cadastradas em lancamentos.</p>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 text-2xl font-black leading-none text-white" type="button" title="Criar categoria" onClick={() => setCreatingCategory((current) => !current)}>+</button>
        </div>

        {creatingCategory && <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="mb-0">Nova categoria<input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Coca Cola, Gelo, Hortifruti" /></label>
          <button className="self-end rounded-xl bg-slate-900 px-4 py-3 font-black text-white" type="button" onClick={createCategory}>Salvar</button>
        </div>}

        <div className="mt-4 grid gap-3 lg:grid-cols-[240px_minmax(260px,1fr)] xl:grid-cols-[240px_minmax(280px,1fr)_auto]">
          <label className="mb-0">Fornecedor / tipo<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="todos">Todos</option>{snapshot.categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label className="mb-0">Buscar boleto<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Fornecedor, referencia, descricao, data..." /></label>
          <div className="flex flex-wrap content-end gap-2">
            {([{ id: "pendente", label: "Pendentes" }, { id: "vencido", label: "Vencidas" }, { id: "todos", label: "Todas em aberto" }] as { id: StatusFilter; label: string }[]).map((item) => <button key={item.id} className={`rounded-xl px-4 py-2 text-sm font-black ${status === item.id ? "bg-orange-500 text-white" : "border border-slate-200 bg-white text-slate-600"}`} type="button" onClick={() => setStatusFilter(item.id)}>{item.label}</button>)}
          </div>
        </div>

        {actionError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{actionError}</p>}
      </section>

      <EntryTable entries={entries} onPay={(id) => setStatus(id, "pago")} showStatus simpleActions />
    </div>}
  </FinanceShell>;
}
