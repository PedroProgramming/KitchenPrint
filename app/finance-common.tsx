"use client";

import { useEffect, useState } from "react";
import DashboardSidebar from "./dashboard-sidebar";
import { type SidebarUser } from "./sidebar";

export type EntryType = "receita" | "despesa";
export type PaymentMethod = "dinheiro" | "pix" | "cartao" | "boleto" | "outro";
export type EntryStatus = "pago" | "pendente" | "cancelado";
export type CashRegister = { id: string; businessDate: string; openingAmount: number; closingAmount: number | null; expectedAmount: number | null; differenceAmount: number | null; openedBy: string; closedAt: string | null };
export type FinanceEntry = { id: string; cashRegisterId: string | null; entryDate: string; type: EntryType; category: string; description: string; amount: number; paymentMethod: PaymentMethod; status: EntryStatus; dueDate: string | null; supplier: string; documentNumber: string; documentNote: string; proofImageName: string; proofImageDataUrl: string; installmentGroupId: string | null; installmentNumber: number; installmentTotal: number };
export type FinanceCategory = { id: string; name: string };
export type FinanceSnapshot = { cashRegisters: CashRegister[]; entries: FinanceEntry[]; openCash: CashRegister | null; totals: { revenue: number; expenses: number; cashRevenue: number; cashExpenses: number; balance: number; pendingPayables: number; overduePayables: number }; pendingPayables: FinanceEntry[]; categories: FinanceCategory[] };

export const pad = (value: number) => String(value).padStart(2, "0");
export const localDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const today = localDate(new Date());
export const monthStart = localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
export const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
export const moneyNumber = (value: string) => Number(value.replace(/\./g, "").replace(",", "."));
export const addDays = (date: Date, days: number) => { const copy = new Date(date); copy.setDate(copy.getDate() + days); return copy; };

export function financeCategories(entries: FinanceEntry[]) {
  const counts = new Map<string, { category: string; suppliers: Set<string>; total: number }>();
  for (const entry of entries) {
    const category = entry.category.trim();
    if (!category) continue;
    const key = category.toLowerCase();
    const row = counts.get(key) ?? { category, suppliers: new Set<string>(), total: 0 };
    if (entry.supplier.trim()) row.suppliers.add(entry.supplier.trim());
    row.total += 1;
    counts.set(key, row);
  }
  return [...counts.values()].sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}

export function suppliersByCategory(entries: FinanceEntry[], category: string) {
  const selected = category.trim().toLowerCase();
  if (!selected) return [];
  return [...new Set(entries.filter((entry) => entry.category.trim().toLowerCase() === selected).map((entry) => entry.supplier.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function useFinanceSnapshot() {
  const [user, setUser] = useState<SidebarUser | null>(null);
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    const response = await fetch(`/api/finance?from=${monthStart}&to=${today}`);
    const data = await readJson(response);
    if (!response.ok) throw new Error(data.error ?? "Nao foi possivel carregar o financeiro.");
    setSnapshot(data);
  }

  useEffect(() => {
    fetch("/api/auth/me").then(async (response) => {
      const data = await readJson(response);
      if (!response.ok || data.user?.role !== "admin") throw new Error("Acesso negado");
      setUser(data.user);
      await refresh();
    }).catch((cause) => setError(cause.message));
  }, []);

  return { user, snapshot, error, refresh };
}

export function FinanceShell({ user, error, loading, title, eyebrow, active, children }: { user: SidebarUser | null; error: string; loading: boolean; title: string; eyebrow: string; active: "caixa" | "boletos" | "lancamentos" | "fechamentos"; children: React.ReactNode }) {
  if (error) return <main className="grid min-h-screen place-items-center bg-slate-100 p-5"><div className="rounded-2xl bg-white p-8 text-center shadow"><h1 className="text-xl font-black">Acesso restrito</h1><p className="mt-2 text-slate-500">{error}</p><a className="mt-5 inline-block cursor-pointer rounded-xl bg-orange-500 px-4 py-2 font-bold text-white" href="/">Voltar</a></div></main>;
  if (!user || loading) return <main className="grid min-h-screen place-items-center bg-slate-100 text-slate-500">Carregando...</main>;
  return <main className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
    <DashboardSidebar user={user} active={active} />
    <section className="min-w-0 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7"><p className="text-xs font-black uppercase tracking-widest text-orange-500">{eyebrow}</p><h1 className="text-3xl font-black sm:text-4xl">{title}</h1></header>
        {children}
      </div>
    </section>
  </main>;
}

export function SummaryCards({ snapshot }: { snapshot: FinanceSnapshot }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <Card label="Receitas pagas" value={money(snapshot.totals.revenue)} tone="good" />
    <Card label="Despesas pagas" value={money(snapshot.totals.expenses)} tone="bad" />
    <Card label="Saldo" value={money(snapshot.totals.balance)} tone={snapshot.totals.balance < 0 ? "bad" : "good"} />
    <Card label="A pagar" value={money(snapshot.totals.pendingPayables)} />
    <Card label="Vencido" value={money(snapshot.totals.overduePayables)} tone={snapshot.totals.overduePayables > 0 ? "bad" : "plain"} />
  </div>;
}

export function Card({ label, value, tone = "plain" }: { label: string; value: string; tone?: "plain" | "good" | "bad" }) {
  const styles = tone === "bad" ? "border-red-100 bg-red-50 text-red-700" : tone === "good" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-900";
  return <div className={`rounded-2xl border p-5 shadow-sm ${styles}`}><p className="text-sm font-bold text-slate-500">{label}</p><strong className="mt-2 block text-2xl font-black">{value}</strong></div>;
}

export function EntryTable({ entries, onPay, onCancel, showStatus = false, simpleActions = false }: { entries: FinanceEntry[]; onPay?: (id: string) => void; onCancel?: (id: string) => void; showStatus?: boolean; simpleActions?: boolean }) {
  if (!entries.length) return <p className="rounded-2xl border border-slate-200 bg-white py-10 text-center text-slate-400">Nenhum lancamento encontrado.</p>;
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Data</th><th className="pb-3">Descricao</th><th className="pb-3">Tipo</th><th className="pb-3">Forma</th>{showStatus && <th className="pb-3">Status</th>}<th className="pb-3">Comprovante</th><th className="pb-3 text-right">Valor</th><th className="pb-3 text-right">Acoes</th></tr></thead><tbody className="divide-y divide-slate-100">{entries.map((item) => <tr key={item.id}><td className="py-3 font-bold">{item.dueDate && item.status === "pendente" ? item.dueDate : item.entryDate}</td><td className="py-3"><strong className="block">{item.description || item.category}</strong><span className="text-xs text-slate-500">{item.installmentTotal > 1 ? `Parcela ${item.installmentNumber}/${item.installmentTotal}` : item.category}{item.documentNumber ? ` - ${item.documentNumber}` : ""}{item.documentNote ? ` - ${item.documentNote}` : ""}</span></td><td className="py-3">{item.category}</td><td className="py-3 capitalize">{item.paymentMethod}</td>{showStatus && <td className="py-3 capitalize">{item.status}</td>}<td className="py-3">{item.proofImageDataUrl ? <a className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700" href={item.proofImageDataUrl} target="_blank" rel="noreferrer">{item.proofImageName || "Ver comprovante"}</a> : <span className="text-xs font-bold text-slate-400">Sem arquivo</span>}</td><td className={`py-3 text-right font-black ${item.type === "despesa" ? "text-red-600" : "text-emerald-600"}`}>{item.type === "despesa" ? "-" : "+"}{money(item.amount)}</td><td className="py-3"><div className="flex justify-end gap-2">{item.status !== "pago" && onPay && <button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white" type="button" onClick={() => confirm("Confirmar como pago? Depois de marcado como pago, este lancamento nao podera voltar para pendente.") && onPay(item.id)}>Pago</button>}{!simpleActions && item.status !== "pago" && item.status !== "cancelado" && onCancel && <button className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-black text-amber-700" type="button" onClick={() => onCancel(item.id)}>Cancelar</button>}</div></td></tr>)}</tbody></table></div>;
}

export function CashTable({ rows, entries = [] }: { rows: CashRegister[]; entries?: FinanceEntry[] }) {
  const [selected, setSelected] = useState<CashRegister | null>(null);
  if (!rows.length) return <p className="rounded-2xl border border-slate-200 bg-white py-10 text-center text-slate-400">Nenhum caixa encontrado.</p>;
  return <><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Data</th><th className="pb-3 text-right">Inicial</th><th className="pb-3 text-right">Previsto</th><th className="pb-3 text-right">Contado</th><th className="pb-3 text-right">Diferenca</th><th className="pb-3 text-right">Detalhes</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((cash) => {
    const movements = cashMovements(cash, entries);
    return <tr key={cash.id}><td className="py-3 font-bold">{cash.businessDate}</td><td className="py-3 text-right">{money(cash.openingAmount)}</td><td className="py-3 text-right">{cash.expectedAmount === null ? "-" : money(cash.expectedAmount)}</td><td className="py-3 text-right">{cash.closingAmount === null ? "Aberto" : money(cash.closingAmount)}</td><td className={`py-3 text-right font-black ${(cash.differenceAmount ?? 0) < 0 ? "text-red-600" : "text-emerald-600"}`}>{cash.differenceAmount === null ? "-" : money(cash.differenceAmount)}</td><td className="py-3 text-right"><button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700" type="button" onClick={() => setSelected(cash)}>Ver caixa ({movements.length})</button></td></tr>;
  })}</tbody></table></div>{selected && <CashDetailsModal cash={selected} entries={cashMovements(selected, entries)} onClose={() => setSelected(null)} />}</>;
}

function cashMovements(cash: CashRegister, entries: FinanceEntry[]) {
  return entries.filter((entry) => entry.status === "pago" && entry.paymentMethod === "dinheiro" && (entry.cashRegisterId === cash.id || entry.entryDate === cash.businessDate));
}

function CashDetailsModal({ cash, entries, onClose }: { cash: CashRegister; entries: FinanceEntry[]; onClose: () => void }) {
  const revenues = entries.filter((entry) => entry.type === "receita");
  const expenses = entries.filter((entry) => entry.type === "despesa");
  const revenueTotal = revenues.reduce((total, entry) => total + entry.amount, 0);
  const expenseTotal = expenses.reduce((total, entry) => total + entry.amount, 0);
  const calculated = cash.openingAmount - expenseTotal + revenueTotal;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
    <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
        <div><p className="text-xs font-black uppercase tracking-widest text-orange-500">Detalhes do fechamento</p><h2 className="text-2xl font-black">{cash.businessDate}</h2></div>
        <button className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black" type="button" onClick={onClose}>Fechar</button>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-4">
        <Card label="Inicial" value={money(cash.openingAmount)} />
        <Card label="Entradas dinheiro" value={money(revenueTotal)} tone="good" />
        <Card label="Saidas dinheiro" value={money(expenseTotal)} tone="bad" />
        <Card label="Calculado" value={money(calculated)} tone={calculated < 0 ? "bad" : "good"} />
      </div>
      <div className="px-5 pb-5">
        <div className="mb-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">Conta: {money(cash.openingAmount)} - {money(expenseTotal)} + {money(revenueTotal)} = {money(calculated)}</div>
        {entries.length ? <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-400"><tr><th className="p-3">Movimento</th><th className="p-3">Forma</th><th className="p-3 text-right">Valor</th></tr></thead><tbody className="divide-y divide-slate-100">{entries.map((entry) => <tr key={entry.id}><td className="p-3"><strong className="block">{entry.description || entry.category}</strong><small className="text-slate-500">{entry.category}{entry.documentNumber ? ` - ${entry.documentNumber}` : ""}</small></td><td className="p-3 capitalize">{entry.type === "receita" ? "Entrada" : "Saida"}</td><td className={`p-3 text-right font-black ${entry.type === "receita" ? "text-emerald-600" : "text-red-600"}`}>{entry.type === "receita" ? "+" : "-"}{money(entry.amount)}</td></tr>)}</tbody></table></div> : <p className="rounded-xl border border-slate-200 bg-slate-50 py-8 text-center text-sm font-bold text-slate-400">Nenhuma movimentacao em dinheiro vinculada a este dia.</p>}
      </div>
    </div>
  </div>;
}
