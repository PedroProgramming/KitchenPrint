"use client";

import { useEffect, useState } from "react";
import DashboardSidebar from "./dashboard-sidebar";
import { type SidebarUser } from "./sidebar";

export type EntryType = "receita" | "despesa";
export type PaymentMethod = "dinheiro" | "pix" | "cartao" | "boleto" | "outro";
export type EntryStatus = "pago" | "pendente" | "cancelado";
export type CashRegister = { id: string; businessDate: string; openingAmount: number; closingAmount: number | null; expectedAmount: number | null; differenceAmount: number | null; openedBy: string; closedAt: string | null };
export type FinanceProofImage = { name: string; dataUrl: string };
export type FinanceEntry = { id: string; cashRegisterId: string | null; entryDate: string; type: EntryType; category: string; description: string; amount: number; paymentMethod: PaymentMethod; status: EntryStatus; dueDate: string | null; paidAt: string | null; originalDueDate: string | null; dueDateAdjusted: boolean; supplier: string; documentNumber: string; documentNote: string; proofImageName: string; proofImageDataUrl: string; proofImages: FinanceProofImage[]; installmentGroupId: string | null; installmentNumber: number; installmentTotal: number; installmentIntervalDays: number; createdAt: string };
export type FinanceCategory = { id: string; name: string };
export type FinanceSnapshot = { cashRegisters: CashRegister[]; entries: FinanceEntry[]; openCash: CashRegister | null; totals: { revenue: number; expenses: number; cashRevenue: number; cashExpenses: number; balance: number; pendingPayables: number; overduePayables: number }; pendingPayables: FinanceEntry[]; categories: FinanceCategory[] };

export const pad = (value: number) => String(value).padStart(2, "0");
export const localDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const today = localDate(new Date());
export const monthStart = localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
export const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
export const moneyNumber = (value: string) => Number(value.replace(/\./g, "").replace(",", "."));
export const addDays = (date: Date, days: number) => { const copy = new Date(date); copy.setDate(copy.getDate() + days); return copy; };
export const dateText = (value?: string | null) => {
  if (!value) return "-";
  const [date] = value.split("T");
  const parts = date.split("-");
  if (parts.length !== 3) return value;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

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

function previewText(value: string, limit = 48) {
  const text = value.trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}...`;
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

export function EntryTable({ entries, onPay, onCancel, onEdit, showStatus = false, simpleActions = false }: { entries: FinanceEntry[]; onPay?: (id: string) => void; onCancel?: (id: string) => void; onEdit?: (entry: FinanceEntry) => void; showStatus?: boolean; simpleActions?: boolean }) {
  const [proofEntry, setProofEntry] = useState<FinanceEntry | null>(null);
  const [details, setDetails] = useState<FinanceEntry | null>(null);
  if (!entries.length) return <p className="rounded-2xl border border-slate-200 bg-white py-10 text-center text-slate-400">Nenhum lancamento encontrado.</p>;
  return <>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
          <tr><th className="pb-3">Data</th><th className="pb-3">Descricao</th><th className="pb-3">Tipo</th><th className="pb-3">Forma</th>{showStatus && <th className="pb-3">Status</th>}<th className="pb-3 text-right">Valor</th><th className="pb-3 text-right">Acoes</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((item) => {
            const displayDate = item.dueDate && item.status === "pendente" ? item.dueDate : item.entryDate;
            const canceled = item.status === "cancelado";
            const rowStyle = canceled ? "bg-slate-50 text-slate-400 opacity-70" : "";
            const mutedText = canceled ? "text-slate-400" : "text-slate-500";
            const valueStyle = canceled ? "text-slate-400 line-through" : item.type === "despesa" ? "text-red-600" : "text-emerald-600";
            const details = [
              item.installmentTotal > 1 ? `Parcela: ${item.installmentNumber}/${item.installmentTotal}` : "Parcela: Unica",
              `Fornecedor: ${item.category}`,
              item.installmentTotal > 1 && item.installmentIntervalDays ? `Intervalo: ${item.installmentIntervalDays} dias` : "",
              item.documentNumber ? `Ref.: ${item.documentNumber}` : "",
              item.documentNote ? `Obs.: ${previewText(item.documentNote)}` : "",
            ].filter(Boolean);
            const statusStyle = canceled ? "bg-slate-200 text-slate-500" : item.status === "pago" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
            const statusLabel = item.status === "pago" ? "pago" : item.status === "pendente" ? "pendente" : "cancelado";
            return <tr className={rowStyle} key={item.id}>
              <td className="py-3 font-bold"><span className="block">{dateText(displayDate)}</span>{item.dueDateAdjusted && <small className={`block text-[11px] font-bold ${canceled ? "text-slate-400" : "text-amber-600"}`}>Ajustado de {dateText(item.originalDueDate)}</small>}</td>
              <td className="py-3"><strong className={`block ${canceled ? "line-through" : ""}`}>{item.description || item.category}</strong><span className={`text-xs ${mutedText}`}>{details.join(" | ")}</span></td>
              <td className="py-3">{item.category}</td>
              <td className="py-3 capitalize">{item.paymentMethod}</td>
              {showStatus && <td className="py-3"><span className={`rounded-lg px-2 py-1 text-xs font-black capitalize ${statusStyle}`}>{statusLabel}</span></td>}
              <td className={`py-3 text-right font-black ${valueStyle}`}>{item.type === "despesa" ? "-" : "+"}{money(item.amount)}</td>
              <td className="py-3"><div className="flex justify-end gap-2"><button className={`rounded-lg border px-3 py-2 text-xs font-black ${canceled ? "border-slate-200 bg-white text-slate-400" : "border-slate-200 bg-slate-50 text-slate-700"}`} type="button" onClick={() => setDetails(item)}>Ver</button>{onEdit && <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700" type="button" onClick={() => onEdit(item)}>Editar</button>}{item.status === "pendente" && onPay && <button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white" type="button" onClick={() => confirm("Confirmar como pago? Depois de marcado como pago, este lancamento nao podera voltar para pendente.") && onPay(item.id)}>Marcar pago</button>}{!simpleActions && item.status === "pendente" && onCancel && <button className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-black text-amber-700" type="button" onClick={() => onCancel(item.id)}>Cancelar</button>}</div></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    {details && <EntryDetailsModal entry={details} onProof={() => setProofEntry(details)} onClose={() => setDetails(null)} />}
    {proofEntry && <ProofModal entry={proofEntry} onClose={() => setProofEntry(null)} />}
  </>;
}

function DetailRow({ label, value, tone = "plain" }: { label: string; value: React.ReactNode; tone?: "plain" | "warning" }) {
  return <div className={tone === "warning" ? "rounded-xl border border-amber-200 bg-amber-50 p-3" : "rounded-xl border border-slate-200 bg-slate-50 p-3"}>
    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <div className={tone === "warning" ? "mt-1 font-black text-amber-700" : "mt-1 font-bold text-slate-800"}>{value || "-"}</div>
  </div>;
}

function EntryDetailsModal({ entry, onProof, onClose }: { entry: FinanceEntry; onProof: () => void; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
    <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
        <div><p className="text-xs font-black uppercase tracking-widest text-orange-500">Detalhes do lancamento</p><h2 className="text-2xl font-black">{entry.description || entry.category}</h2></div>
        <button className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black" type="button" onClick={onClose}>Fechar</button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <DetailRow label="Valor" value={money(entry.amount)} />
          <DetailRow label="Status" value={entry.status} />
          <DetailRow label="Forma" value={entry.paymentMethod} />
          <DetailRow label="Data de registro" value={dateText(entry.entryDate)} />
          <DetailRow label="Vencimento original" value={dateText(entry.originalDueDate ?? entry.dueDate)} tone={entry.dueDateAdjusted ? "warning" : "plain"} />
          <DetailRow label="Vencimento para pagamento" value={dateText(entry.dueDate)} tone={entry.dueDateAdjusted ? "warning" : "plain"} />
          <DetailRow label="Fornecedor / tipo" value={entry.category} />
          <DetailRow label="Parcela" value={entry.installmentTotal > 1 ? `${entry.installmentNumber}/${entry.installmentTotal}` : "Unica"} />
          <DetailRow label="Intervalo" value={entry.installmentTotal > 1 ? `${entry.installmentIntervalDays} dias` : "-"} />
          <DetailRow label="Referencia" value={entry.documentNumber} />
          <DetailRow label="Pago em" value={dateText(entry.paidAt)} />
          <DetailRow label="Criado em" value={dateText(entry.createdAt)} />
        </div>
        {entry.dueDateAdjusted && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-700">O vencimento original caiu em dia nao util, entao o sistema ajustou o pagamento para o proximo dia util.</p>}
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Detalhes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm font-bold text-slate-700">{entry.documentNote || "Sem detalhes cadastrados."}</p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {entry.proofImageName || entry.proofImages.length ? <button className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white" type="button" onClick={onProof}>Ver comprovantes</button> : <span className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-400">Sem comprovante</span>}
        </div>
      </div>
    </div>
  </div>;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Imagem invalida.")), type, quality));
}

async function optimizeImageForDownload(source: string) {
  const image = new Image();
  image.src = source;
  await image.decode();
  const limit = 2400;
  const scale = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Nao foi possivel preparar o download.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);
  return canvasBlob(canvas, "image/jpeg", 0.94);
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function ProofModal({ entry, onClose }: { entry: FinanceEntry; onClose: () => void }) {
  const [failed, setFailed] = useState(false);
  const initialProofs = entry.proofImages.length ? entry.proofImages : entry.proofImageName || entry.proofImageDataUrl ? [{ name: entry.proofImageName || "Comprovante", dataUrl: entry.proofImageDataUrl }] : [];
  const [proofs, setProofs] = useState<FinanceProofImage[]>(initialProofs);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedProof = proofs[selectedIndex] ?? null;
  const [loading, setLoading] = useState(!initialProofs.some((proof) => proof.dataUrl));
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (initialProofs.some((proof) => proof.dataUrl)) return;
    let active = true;
    setLoading(true);
    fetch(`/api/finance?proofId=${entry.id}`).then(async (response) => {
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error ?? "Nao foi possivel carregar o comprovante.");
      if (active) {
        const nextProofs = Array.isArray(data.proofImages) && data.proofImages.length ? data.proofImages : data.proofImageName || data.proofImageDataUrl ? [{ name: data.proofImageName || "Comprovante", dataUrl: data.proofImageDataUrl ?? "" }] : [];
        setProofs(nextProofs);
        setSelectedIndex(0);
      }
    }).catch(() => {
      if (active) setFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [entry.id]);

  async function downloadProof() {
    if (!selectedProof?.dataUrl) return;
    setDownloading(true);
    try {
      const blob = await optimizeImageForDownload(selectedProof.dataUrl);
      const name = (selectedProof.name || entry.description || "comprovante").replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-");
      downloadBlob(blob, `${name || "comprovante"}-download.jpg`);
    } catch {
      const link = document.createElement("a");
      link.href = selectedProof.dataUrl;
      link.download = selectedProof.name || "comprovante";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      setDownloading(false);
    }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
    <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
        <div><p className="text-xs font-black uppercase tracking-widest text-orange-500">Comprovantes</p><h2 className="text-xl font-black">{selectedProof?.name || entry.description}</h2></div>
        <div className="flex gap-2">
          <button className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white disabled:opacity-50" type="button" disabled={loading || !selectedProof?.dataUrl || downloading} onClick={downloadProof}>{downloading ? "Preparando..." : "Baixar"}</button>
          <button className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black" type="button" onClick={onClose}>Fechar</button>
        </div>
      </div>
      <div className="max-h-[75vh] overflow-auto bg-slate-100 p-4">
        {proofs.length > 1 && <div className="mb-3 flex flex-wrap gap-2">{proofs.map((proof, index) => <button className={`rounded-lg px-3 py-2 text-xs font-black ${index === selectedIndex ? "bg-orange-500 text-white" : "bg-white text-slate-700"}`} key={`${proof.name}-${index}`} type="button" onClick={() => { setFailed(false); setSelectedIndex(index); }}>{proof.name || `Comprovante ${index + 1}`}</button>)}</div>}
        {loading ? <div className="rounded-xl bg-white p-6 text-center font-bold text-slate-500 shadow">Carregando comprovantes...</div> : failed || !selectedProof?.dataUrl ? <div className="rounded-xl bg-white p-6 text-center shadow">
          <p className="font-bold text-slate-600">Nao foi possivel exibir a imagem aqui.</p>
          {selectedProof?.dataUrl && <a className="mt-4 inline-block rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white" href={selectedProof.dataUrl} target="_blank" rel="noreferrer">Abrir comprovante</a>}
        </div> : <img className="mx-auto max-h-[70vh] max-w-full rounded-xl bg-white object-contain shadow" src={selectedProof.dataUrl} alt={selectedProof.name || "Comprovante"} onError={() => setFailed(true)} />}
      </div>
    </div>
  </div>;
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
