"use client";

import { type FormEvent, useMemo, useState } from "react";
import { EntryTable, FinanceShell, dateText, money, moneyNumber, readJson, today, type EntryStatus, type FinanceEntry, type PaymentMethod, useFinanceSnapshot } from "../finance-common";

type StatusFilter = "a_pagar" | "vencido" | "pago" | "cancelado" | "todos";
type EditForm = { id: string; entryDate: string; category: string; description: string; amount: string; paymentMethod: PaymentMethod; status: EntryStatus; dueDate: string; documentNumber: string; documentNote: string };

const shortDate = (value?: string | null) => {
  if (!value) return "-";
  const [, month, day] = value.split("-");
  return day && month ? `${day}/${month}` : dateText(value);
};

const daysBetween = (from: string, to: string) => {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  const start = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const end = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((end - start) / 86400000);
};

function PayableMetric({ label, value, hint, tone = "plain" }: { label: string; value: string; hint: string; tone?: "plain" | "bad" | "good" | "warn" }) {
  const styles = tone === "bad" ? "border-red-100 bg-red-50 text-red-700" : tone === "good" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : tone === "warn" ? "border-amber-100 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-900";
  return <div className={`rounded-2xl border p-5 shadow-sm ${styles}`}>
    <p className="text-sm font-bold text-slate-500">{label}</p>
    <strong className="mt-2 block text-2xl font-black">{value}</strong>
    <span className="mt-1 block text-xs font-bold text-slate-500">{hint}</span>
  </div>;
}

export default function BoletosPage() {
  const { user, snapshot, error, refresh } = useFinanceSnapshot(true);
  const [status, setStatusFilter] = useState<StatusFilter>("a_pagar");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [category, setCategory] = useState("todos");
  const [search, setSearch] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [actionError, setActionError] = useState("");
  const [editing, setEditing] = useState<EditForm | null>(null);

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

  function startEdit(entry: FinanceEntry) {
    setActionError("");
    setEditing({
      id: entry.id,
      entryDate: entry.entryDate,
      category: entry.category,
      description: entry.description,
      amount: String(entry.amount).replace(".", ","),
      paymentMethod: entry.paymentMethod,
      status: entry.status,
      dueDate: entry.originalDueDate ?? entry.dueDate ?? "",
      documentNumber: entry.documentNumber,
      documentNote: entry.documentNote,
    });
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setActionError("");
    const response = await fetch("/api/finance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "entry",
        id: editing.id,
        entryDate: editing.entryDate,
        type: "despesa",
        category: editing.category,
        description: editing.description,
        amount: moneyNumber(editing.amount),
        paymentMethod: editing.paymentMethod,
        status: editing.status,
        dueDate: editing.dueDate || null,
        documentNumber: editing.documentNumber,
        documentNote: editing.documentNote,
        supplier: "",
      }),
    });
    const data = await readJson(response);
    if (!response.ok) return setActionError(data.error ?? "Nao foi possivel editar o boleto.");
    setEditing(null);
    await refresh();
  }

  const entries = useMemo(() => {
    const rows = (snapshot?.entries ?? []).filter((entry) => entry.type === "despesa");
    const term = search.trim().toLowerCase();
    return rows.filter((entry) => {
      const matchesCategory = category === "todos" || entry.category === category;
      const date = entry.dueDate ?? entry.entryDate;
      const matchesMonth = month === "todos" || date.startsWith(month);
      const matchesStatus =
        status === "todos" ||
        (status === "a_pagar" && entry.status === "pendente") ||
        (status === "vencido" && entry.status === "pendente" && date < today) ||
        entry.status === status;
      const searchable = [entry.category, entry.description, entry.documentNumber, entry.documentNote, entry.proofImageName, entry.paymentMethod, entry.status, date].join(" ").toLowerCase();
      const matchesSearch = !term || searchable.includes(term);
      return matchesMonth && matchesCategory && matchesStatus && matchesSearch;
    }).sort((a, b) => String(a.dueDate ?? a.entryDate).localeCompare(String(b.dueDate ?? b.entryDate)));
  }, [category, month, search, snapshot, status]);

  const payableInsights = useMemo(() => {
    const allExpenses = (snapshot?.entries ?? []).filter((entry) => entry.type === "despesa" && entry.status !== "cancelado");
    const pending = allExpenses.filter((entry) => entry.status === "pendente");
    const paid = allExpenses.filter((entry) => entry.status === "pago");
    const overdue = pending.filter((entry) => String(entry.dueDate ?? entry.entryDate) < today);
    const next7 = pending.filter((entry) => {
      const diff = daysBetween(today, String(entry.dueDate ?? entry.entryDate));
      return diff >= 0 && diff <= 7;
    });
    const total = (rows: FinanceEntry[]) => rows.reduce((sum, entry) => sum + entry.amount, 0);
    const byCategory = new Map<string, { name: string; amount: number; count: number }>();
    for (const entry of allExpenses) {
      const name = entry.category || "Sem categoria";
      const key = name.toLowerCase();
      const row = byCategory.get(key) ?? { name, amount: 0, count: 0 };
      row.amount += entry.amount;
      row.count += 1;
      byCategory.set(key, row);
    }
    const ranking = [...byCategory.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
    const priority = [...pending].sort((a, b) => String(a.dueDate ?? a.entryDate).localeCompare(String(b.dueDate ?? b.entryDate)) || b.amount - a.amount).slice(0, 6);
    return {
      pendingTotal: total(pending),
      paidTotal: total(paid),
      overdueTotal: total(overdue),
      next7Total: total(next7),
      pendingCount: pending.length,
      paidCount: paid.length,
      overdueCount: overdue.length,
      next7Count: next7.length,
      ranking,
      priority,
      biggest: ranking[0] ?? null,
    };
  }, [snapshot]);

  return <FinanceShell user={user} error={error} loading={!snapshot} title="Boletos e contas" eyebrow="Controle de pagamentos" active="boletos">
    {snapshot && <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PayableMetric label="Em aberto" value={money(payableInsights.pendingTotal)} hint={`${payableInsights.pendingCount} conta(s) pendente(s)`} tone="warn" />
        <PayableMetric label="Vencido" value={money(payableInsights.overdueTotal)} hint={`${payableInsights.overdueCount} precisa(m) de atencao`} tone={payableInsights.overdueTotal > 0 ? "bad" : "plain"} />
        <PayableMetric label="Proximos 7 dias" value={money(payableInsights.next7Total)} hint={`${payableInsights.next7Count} vencimento(s) chegando`} />
        <PayableMetric label="Pago no periodo" value={money(payableInsights.paidTotal)} hint={`${payableInsights.paidCount} conta(s) quitada(s)`} tone="good" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Proximos pagamentos</h2>
              <p className="text-sm text-slate-500">Ordenado por vencimento, para priorizar o que sai primeiro.</p>
            </div>
            {payableInsights.biggest && <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">Maior gasto: {payableInsights.biggest.name}</span>}
          </div>
          {payableInsights.priority.length ? <div className="grid gap-2">
            {payableInsights.priority.map((entry) => {
              const due = String(entry.dueDate ?? entry.entryDate);
              const diff = daysBetween(today, due);
              const badge = diff < 0 ? `${Math.abs(diff)} dia(s) vencido` : diff === 0 ? "vence hoje" : `${diff} dia(s)`;
              const badgeStyle = diff < 0 ? "bg-red-50 text-red-700" : diff <= 3 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
              return <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[78px_minmax(0,1fr)_auto]" key={entry.id}>
                <div><span className="block text-xs font-black uppercase tracking-wider text-slate-400">Vence</span><strong className="text-lg font-black">{shortDate(due)}</strong></div>
                <div className="min-w-0"><strong className="block truncate">{entry.description || entry.category}</strong><span className="block truncate text-xs font-bold text-slate-500">{entry.category}{entry.documentNumber ? ` - ${entry.documentNumber}` : ""}</span></div>
                <div className="text-left sm:text-right"><strong className="block text-red-600">{money(entry.amount)}</strong><span className={`mt-1 inline-block rounded-lg px-2 py-1 text-[11px] font-black ${badgeStyle}`}>{badge}</span></div>
              </div>;
            })}
          </div> : <p className="rounded-xl border border-slate-200 bg-slate-50 py-8 text-center text-sm font-bold text-slate-400">Nenhuma conta pendente no periodo.</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Gastos por fornecedor/tipo</h2>
          <p className="mb-4 text-sm text-slate-500">Ranking das despesas do periodo, somando pagas e pendentes.</p>
          {payableInsights.ranking.length ? <div className="space-y-3">
            {payableInsights.ranking.map((row) => {
              const percent = payableInsights.ranking[0]?.amount ? Math.max(6, Math.round((row.amount / payableInsights.ranking[0].amount) * 100)) : 0;
              return <div key={row.name}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm"><strong className="truncate">{row.name}</strong><span className="shrink-0 font-black">{money(row.amount)}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${percent}%` }} /></div>
                <span className="mt-1 block text-xs font-bold text-slate-400">{row.count} lancamento(s)</span>
              </div>;
            })}
          </div> : <p className="rounded-xl border border-slate-200 bg-slate-50 py-8 text-center text-sm font-bold text-slate-400">Sem despesas para analisar.</p>}
        </div>
      </section>

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

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(160px,220px)_minmax(180px,260px)_minmax(260px,1fr)]">
          <label className="mb-0">Mês<select className="h-12" value={month} onChange={(event) => setMonth(event.target.value)}><option value="todos">Todos os meses</option>{Array.from({ length: 36 }, (_, index) => { const date = new Date(new Date().getFullYear(), new Date().getMonth() - index, 1); const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; return <option key={value} value={value}>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date)}</option>; })}</select></label>
          <label className="mb-0">Fornecedor / tipo<select className="h-12" value={category} onChange={(event) => setCategory(event.target.value)}><option value="todos">Todos</option>{snapshot.categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label className="mb-0">Buscar boleto<input className="h-12" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Fornecedor, referencia, descricao, data..." /></label>
          <div className="lg:col-span-2">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Status</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {([{ id: "a_pagar", label: "Em aberto" }, { id: "vencido", label: "Vencidas" }, { id: "pago", label: "Pagas" }, { id: "cancelado", label: "Canceladas" }, { id: "todos", label: "Todas" }] as { id: StatusFilter; label: string }[]).map((item) => <button key={item.id} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-black ${status === item.id ? "bg-orange-500 text-white" : "border border-slate-200 bg-white text-slate-600"}`} type="button" onClick={() => setStatusFilter(item.id)}>{item.label}</button>)}
            </div>
          </div>
        </div>

        {actionError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{actionError}</p>}
      </section>

      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Contas filtradas</h2>
            <p className="text-sm text-slate-500">{entries.length} resultado(s) na lista atual.</p>
          </div>
          <strong className="rounded-xl bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm">Total: {money(entries.reduce((sum, entry) => sum + entry.amount, 0))}</strong>
        </div>
        <EntryTable entries={entries} onPay={(id) => setStatus(id, "pago")} onEdit={startEdit} showStatus simpleActions />
      </div>
      {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
        <form className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl" onSubmit={submitEdit}>
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
            <div><p className="text-xs font-black uppercase tracking-widest text-orange-500">Editar boleto</p><h2 className="text-2xl font-black">{editing.category || "Boleto"}</h2></div>
            <button className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black" type="button" onClick={() => setEditing(null)}>Fechar</button>
          </div>
          <div className="max-h-[75vh] overflow-y-auto p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label>Data do registro<input type="date" value={editing.entryDate} onChange={(event) => setEditing({ ...editing, entryDate: event.target.value })} required /></label>
              <label>Vencimento original<input type="date" value={editing.dueDate} onChange={(event) => setEditing({ ...editing, dueDate: event.target.value })} /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>Fornecedor / tipo<select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} required><option value="">Selecione uma categoria</option>{snapshot.categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
              <label>Valor<input inputMode="decimal" placeholder="0,00" value={editing.amount} onChange={(event) => setEditing({ ...editing, amount: event.target.value })} required /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>Forma<select value={editing.paymentMethod} onChange={(event) => setEditing({ ...editing, paymentMethod: event.target.value as PaymentMethod })}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartao</option><option value="boleto">Boleto</option><option value="outro">Outro</option></select></label>
              <label>Status<select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as EntryStatus })}><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="cancelado">Cancelado</option></select></label>
            </div>
            <label>Descricao<input value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} placeholder="Descricao do boleto" /></label>
            <label>Referencia<input value={editing.documentNumber} onChange={(event) => setEditing({ ...editing, documentNumber: event.target.value })} placeholder="Nota, boleto, recibo" /></label>
            <label>Detalhes<textarea value={editing.documentNote} onChange={(event) => setEditing({ ...editing, documentNote: event.target.value })} placeholder="Itens, observacoes ou calculo do fornecedor" /></label>
            {actionError && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{actionError}</p>}
            <button className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-white">Salvar alteracoes</button>
          </div>
        </form>
      </div>}
    </div>}
  </FinanceShell>;
}
