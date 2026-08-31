"use client";

import { type FormEvent, useMemo, useState } from "react";
import { CashTable, FinanceShell, money, moneyNumber, readJson, today, useFinanceSnapshot } from "../finance-common";

export default function CaixaPage() {
  const { user, snapshot, error, refresh } = useFinanceSnapshot();
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState("");
  const dailyCash = useMemo(() => snapshot?.cashRegisters.find((cash) => cash.businessDate === today) ?? null, [snapshot]);
  const openCash = snapshot?.openCash ?? null;
  const dayCashEntries = useMemo(() => (snapshot?.entries ?? []).filter((entry) => entry.status === "pago" && entry.paymentMethod === "dinheiro" && (!openCash || entry.cashRegisterId === openCash.id || entry.entryDate === openCash.businessDate)), [openCash, snapshot]);
  const dayCashRevenue = dayCashEntries.filter((entry) => entry.type === "receita").reduce((total, entry) => total + entry.amount, 0);
  const dayCashExpenses = dayCashEntries.filter((entry) => entry.type === "despesa").reduce((total, entry) => total + entry.amount, 0);
  const expectedCash = openCash ? openCash.openingAmount + dayCashRevenue - dayCashExpenses : 0;

  async function open(event: FormEvent) {
    event.preventDefault();
    setActionError("");
    const response = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "open-cash", businessDate: today, openingAmount: moneyNumber(openingAmount), notes }) });
    const data = await readJson(response);
    if (!response.ok) return setActionError(data.error ?? "Nao foi possivel abrir o caixa.");
    setOpeningAmount("");
    setNotes("");
    await refresh();
  }

  async function close(event: FormEvent) {
    event.preventDefault();
    if (!openCash) return;
    setActionError("");
    const response = await fetch("/api/finance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close-cash", id: openCash.id, closingAmount: moneyNumber(closingAmount), notes }) });
    const data = await readJson(response);
    if (!response.ok) return setActionError(data.error ?? "Nao foi possivel fechar o caixa.");
    setClosingAmount("");
    setNotes("");
    await refresh();
  }

  return <FinanceShell user={user} error={error} loading={!snapshot} title="Caixa" eyebrow="Abertura e fechamento" active="caixa">
    {snapshot && <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">Caixa de hoje</h2>
      <p className="mt-1 text-sm text-slate-500">O caixa e aberto uma vez por dia. Abra no inicio do expediente e feche no fim.</p>
      <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">{openCash ? `Aberto em ${openCash.businessDate} por ${openCash.openedBy}. Previsto: ${money(expectedCash)}.` : dailyCash?.closedAt ? `Caixa de hoje fechado com ${money(dailyCash.closingAmount ?? 0)}.` : "Caixa de hoje ainda nao foi aberto."}</p>
      {openCash && <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl bg-emerald-50 p-3"><span className="block text-xs font-black uppercase text-emerald-700">Entrou dinheiro</span><strong>{money(dayCashRevenue)}</strong></div><div className="rounded-xl bg-red-50 p-3"><span className="block text-xs font-black uppercase text-red-700">Saiu dinheiro</span><strong>{money(dayCashExpenses)}</strong></div></div>}
      {actionError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{actionError}</p>}
      {!openCash && !dailyCash?.closedAt && <form className="mt-4" onSubmit={open}><label>Valor inicial<input inputMode="decimal" placeholder="0,00" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} required /></label><label>Observacao<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label><button className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-white">Abrir caixa</button></form>}
      {openCash && <form className="mt-4" onSubmit={close}><label>Valor contado<input inputMode="decimal" placeholder="0,00" value={closingAmount} onChange={(event) => setClosingAmount(event.target.value)} required /></label><label>Observacao<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label><button className="w-full rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Fechar caixa</button></form>}
    </section>
    <section>
      <h2 className="mb-3 text-xl font-black">Historico de caixas</h2>
      <CashTable rows={snapshot.cashRegisters} entries={snapshot.entries} />
    </section>
    </div>}
  </FinanceShell>;
}
