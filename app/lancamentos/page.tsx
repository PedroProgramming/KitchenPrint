"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import { EntryTable, FinanceShell, SummaryCards, moneyNumber, readJson, today, type EntryStatus, type EntryType, type PaymentMethod, useFinanceSnapshot } from "../finance-common";

type LaunchKind = "cashSale" | "cashExpense" | "payable" | "other";

const emptyEntry = {
  entryDate: today,
  type: "despesa" as EntryType,
  category: "",
  description: "",
  amount: "",
  paymentMethod: "pix" as PaymentMethod,
  status: "pago" as EntryStatus,
  dueDate: today,
  documentNumber: "",
  documentNote: "",
  installments: 1,
  installmentIntervalDays: 30,
  proofImageName: "",
  proofImageDataUrl: "",
};

export default function LancamentosPage() {
  const { user, snapshot, error, refresh } = useFinanceSnapshot();
  const [entry, setEntry] = useState(emptyEntry);
  const [launchKind, setLaunchKind] = useState<LaunchKind>("cashExpense");
  const [formOpen, setFormOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [actionError, setActionError] = useState("");

  async function createCategory() {
    setActionError("");
    const response = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "category", categoryName }) });
    const data = await readJson(response);
    if (!response.ok) return setActionError(data.error ?? "Nao foi possivel criar a categoria.");
    setEntry((current) => ({ ...current, category: categoryName.trim() }));
    setCategoryName("");
    setCreatingCategory(false);
    await refresh();
  }

  async function setStatus(id: string, status: EntryStatus) {
    setActionError("");
    const response = await fetch("/api/finance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "entry-status", id, status }) });
    const data = await readJson(response);
    if (!response.ok) return setActionError(data.error ?? "Nao foi possivel atualizar.");
    await refresh();
  }

  function selectLaunchKind(kind: LaunchKind) {
    setLaunchKind(kind);
    setCreatingCategory(false);
    if (kind === "cashSale") setEntry((current) => ({ ...current, entryDate: today, type: "receita", paymentMethod: "dinheiro", status: "pago", dueDate: "", installments: 1, installmentIntervalDays: 30, category: "Venda dinheiro" }));
    if (kind === "cashExpense") setEntry((current) => ({ ...current, entryDate: today, type: "despesa", paymentMethod: "dinheiro", status: "pago", dueDate: "", installments: 1, installmentIntervalDays: 30, category: "Gasto dinheiro" }));
    if (kind === "payable") setEntry((current) => ({ ...current, entryDate: today, type: "despesa", paymentMethod: "boleto", status: "pendente", dueDate: current.dueDate || today, category: current.category === "Venda dinheiro" || current.category === "Gasto dinheiro" ? "" : current.category }));
  }

  function attachProof(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return setEntry({ ...entry, proofImageName: "", proofImageDataUrl: "" });
    if (file.size > 700_000) return setActionError("Use uma foto de ate 700 KB.");
    const reader = new FileReader();
    reader.onload = () => setEntry((current) => ({ ...current, proofImageName: file.name, proofImageDataUrl: String(reader.result ?? "") }));
    reader.readAsDataURL(file);
  }

  async function submitEntry(event: FormEvent) {
    event.preventDefault();
    setActionError("");
    const openCash = snapshot?.openCash ?? null;
    const type = launchKind === "cashSale" ? "receita" : launchKind === "cashExpense" || launchKind === "payable" ? "despesa" : entry.type;
    const paymentMethod = launchKind === "cashSale" || launchKind === "cashExpense" ? "dinheiro" : launchKind === "payable" ? "boleto" : entry.paymentMethod;
    const status = launchKind === "payable" ? "pendente" : launchKind === "cashSale" || launchKind === "cashExpense" ? "pago" : entry.status;
    const installments = launchKind === "payable" || launchKind === "other" ? entry.installments : 1;
    const entryDate = launchKind === "cashSale" || launchKind === "cashExpense" ? today : entry.entryDate;
    const category = launchKind === "cashSale" ? "Venda dinheiro" : launchKind === "cashExpense" ? "Gasto dinheiro" : entry.category.trim();
    const description = entry.description.trim() || (launchKind === "cashSale" ? "Venda em dinheiro" : category);
    const response = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "entry",
        cashRegisterId: openCash && status === "pago" && paymentMethod === "dinheiro" && entryDate === openCash.businessDate ? openCash.id : null,
        ...entry,
        entryDate,
        type,
        paymentMethod,
        status,
        installments,
        category,
        description,
        supplier: "",
        amount: moneyNumber(entry.amount),
        dueDate: launchKind === "payable" || launchKind === "other" ? entry.dueDate || null : null,
      }),
    });
    const data = await readJson(response);
    if (!response.ok) return setActionError(data.error ?? "Nao foi possivel salvar.");
    setEntry({ ...emptyEntry, category: entry.category, type: entry.type, paymentMethod: entry.paymentMethod, status: entry.status, installmentIntervalDays: entry.installmentIntervalDays });
    setFormOpen(false);
    await refresh();
  }

  return <FinanceShell user={user} error={error} loading={!snapshot} title="Lancamentos" eyebrow="Cadastro financeiro" active="lancamentos">
    {snapshot && <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><h2 className="text-xl font-black">Lancamentos</h2><p className="text-sm text-slate-500">Registre vendas, gastos de caixa e contas a pagar.</p></div>
        <button className="rounded-xl bg-orange-500 px-4 py-3 font-black text-white" type="button" onClick={() => setFormOpen(true)}>Novo lancamento</button>
      </div>
      {formOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
        <form className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl" onSubmit={submitEntry}>
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
            <div><p className="text-xs font-black uppercase tracking-widest text-orange-500">Cadastro financeiro</p><h2 className="text-2xl font-black">Novo lancamento</h2></div>
            <button className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black" type="button" onClick={() => setFormOpen(false)}>Fechar</button>
          </div>
          <div className="max-h-[75vh] overflow-y-auto p-5">
            <div className="mb-4 grid gap-2 sm:grid-cols-4">
              {([{ id: "cashSale", label: "Venda dinheiro" }, { id: "cashExpense", label: "Gasto dinheiro" }, { id: "payable", label: "Boleto/recibo" }, { id: "other", label: "Completo" }] as { id: LaunchKind; label: string }[]).map((item) => <button key={item.id} className={`rounded-xl px-3 py-2 text-sm font-black ${launchKind === item.id ? "bg-orange-500 text-white" : "border border-slate-200 bg-white text-slate-600"}`} type="button" onClick={() => selectLaunchKind(item.id)}>{item.label}</button>)}
            </div>
            {launchKind === "other" && <div className="grid grid-cols-2 gap-3"><label>Tipo<select value={entry.type} onChange={(event) => setEntry({ ...entry, type: event.target.value as EntryType })}><option value="despesa">Despesa</option><option value="receita">Receita</option></select></label><label>Status<select value={entry.status} onChange={(event) => setEntry({ ...entry, status: event.target.value as EntryStatus })}><option value="pago">Pago</option><option value="pendente">Pendente</option></select></label></div>}
            <div className={launchKind === "cashSale" || launchKind === "cashExpense" ? "grid gap-3" : "grid grid-cols-2 gap-3"}>{!(launchKind === "cashSale" || launchKind === "cashExpense") && <label>{launchKind === "payable" ? "Data do registro" : "Data"}<input type="date" value={entry.entryDate} onChange={(event) => setEntry({ ...entry, entryDate: event.target.value })} required /></label>}<label>Valor total<input inputMode="decimal" placeholder="0,00" value={entry.amount} onChange={(event) => setEntry({ ...entry, amount: event.target.value })} required /></label></div>
            {!(launchKind === "cashSale" || launchKind === "cashExpense") && <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_44px]"><label>Fornecedor / tipo<input list="finance-categories" value={entry.category} onChange={(event) => setEntry({ ...entry, category: event.target.value })} placeholder="Coca Cola, Gelo, Hortifruti" required /><datalist id="finance-categories">{snapshot.categories.map((item) => <option key={item.id} value={item.name} />)}</datalist></label><button className="mt-6 grid h-11 w-11 place-items-center rounded-xl bg-orange-500 text-2xl font-black leading-none text-white" type="button" title="Criar categoria" onClick={() => setCreatingCategory((current) => !current)}>+</button></div>}
            {creatingCategory && <div className="mb-3 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto]"><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Coca Cola, Cafe da manha, Almoco" /><button className="rounded-xl bg-slate-900 px-4 py-2 font-black text-white" type="button" onClick={createCategory}>Salvar</button></div>}
            <label>{launchKind === "cashSale" ? "O que entrou" : launchKind === "cashExpense" ? "Onde foi gasto" : "Descricao"}<input value={entry.description} onChange={(event) => setEntry({ ...entry, description: event.target.value })} placeholder={launchKind === "cashSale" ? "Cafe da manha, almoco, bebida..." : launchKind === "cashExpense" ? "Mercado, gelo, troco, fornecedor..." : "Opcional"} /></label>
            {(launchKind === "payable" || launchKind === "other") && <div className="grid grid-cols-2 gap-3"><label>Forma<select value={entry.paymentMethod} onChange={(event) => setEntry({ ...entry, paymentMethod: event.target.value as PaymentMethod })}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartao</option><option value="boleto">Boleto</option><option value="outro">Outro</option></select></label><label>Vencimento inicial<input type="date" value={entry.dueDate} onChange={(event) => setEntry({ ...entry, dueDate: event.target.value })} /></label></div>}
            {launchKind === "payable" && <div className="grid grid-cols-2 gap-3"><label>Parcelas<input min="1" max="36" type="number" value={entry.installments} onChange={(event) => setEntry({ ...entry, installments: Number(event.target.value) })} /></label><label>Intervalo entre parcelas<input min="1" max="365" type="number" value={entry.installmentIntervalDays} onChange={(event) => setEntry({ ...entry, installmentIntervalDays: Number(event.target.value) })} /></label></div>}
            {(launchKind === "payable" || launchKind === "other") && <><label>Referencia<input value={entry.documentNumber} onChange={(event) => setEntry({ ...entry, documentNumber: event.target.value })} placeholder="Nota, boleto, recibo" /></label><label>Comprovante<input accept="image/*" type="file" onChange={attachProof} /></label>{entry.proofImageName && <p className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{entry.proofImageName}</p>}<label>Detalhes<textarea value={entry.documentNote} onChange={(event) => setEntry({ ...entry, documentNote: event.target.value })} placeholder="Itens, observacoes ou calculo do fornecedor" /></label></>}
            {actionError && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{actionError}</p>}
            <button className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-white">Salvar lancamento</button>
          </div>
        </form>
      </div>}
      <div className="space-y-5">
        <SummaryCards snapshot={snapshot} />
        <EntryTable entries={snapshot.entries.filter((entry) => entry.status !== "pago")} onPay={(id) => setStatus(id, "pago")} onCancel={(id) => setStatus(id, "cancelado")} showStatus />
      </div>
    </div>}
  </FinanceShell>;
}
