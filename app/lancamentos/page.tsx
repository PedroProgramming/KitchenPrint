"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { EntryTable, FinanceShell, money, moneyNumber, readJson, today, type EntryStatus, type EntryType, type FinanceEntry, type PaymentMethod, useFinanceSnapshot } from "../finance-common";

type LaunchKind = "cashSale" | "cashExpense" | "payable" | "other";

const cashSaleDescriptions = ["Cafe da manha", "Almoco", "Cafe da tarde", "Jantar"];
const cashExpenseCategories = ["Fornecedor", "Mercado", "Padaria", "Bebidas", "Gelo", "Troco", "Limpeza", "Manutencao", "Outros"];

function LaunchMetric({ label, value, hint, tone = "plain" }: { label: string; value: string; hint: string; tone?: "plain" | "good" | "bad" | "warn" }) {
  const styles = tone === "bad" ? "border-red-100 bg-red-50 text-red-700" : tone === "good" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : tone === "warn" ? "border-amber-100 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-900";
  return <div className={`rounded-2xl border p-5 shadow-sm ${styles}`}>
    <p className="text-sm font-bold text-slate-500">{label}</p>
    <strong className="mt-2 block text-2xl font-black">{value}</strong>
    <span className="mt-1 block text-xs font-bold text-slate-500">{hint}</span>
  </div>;
}

const emptyEntry = {
  deliveryDate: today,
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
  installmentAmounts: [] as string[],
  proofImageName: "",
  proofImageDataUrl: "",
  proofImages: [] as { name: string; dataUrl: string }[],
};

export default function LancamentosPage() {
  const { user, snapshot, error, refresh } = useFinanceSnapshot();
  const [entry, setEntry] = useState(emptyEntry);
  const [launchKind, setLaunchKind] = useState<LaunchKind>("cashExpense");
  const [formOpen, setFormOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [actionError, setActionError] = useState("");
  const [proofBusy, setProofBusy] = useState(false);

  const launchTotals = useMemo(() => {
    const entries = snapshot?.entries ?? [];
    const activeEntries = entries.filter((item) => item.status !== "cancelado");
    const paidRevenue = activeEntries.filter((item) => item.status === "pago" && item.type === "receita");
    const paidExpenses = activeEntries.filter((item) => item.status === "pago" && item.type === "despesa");
    const pending = activeEntries.filter((item) => item.status === "pendente");
    const total = (rows: FinanceEntry[]) => rows.reduce((sum, item) => sum + item.amount, 0);
    const revenueTotal = total(paidRevenue);
    const expenseTotal = total(paidExpenses);
    return {
      revenueTotal,
      expenseTotal,
      balanceTotal: revenueTotal - expenseTotal,
      pendingTotal: total(pending),
      revenueCount: paidRevenue.length,
      expenseCount: paidExpenses.length,
      pendingCount: pending.length,
      totalCount: activeEntries.length,
    };
  }, [snapshot]);

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
    if (kind === "cashSale") setEntry((current) => ({ ...current, entryDate: today, type: "receita", paymentMethod: "dinheiro", status: "pago", dueDate: "", installments: 1, installmentIntervalDays: 30, installmentAmounts: [], category: "Venda dinheiro", description: current.category === "Venda dinheiro" ? current.description : "" }));
    if (kind === "cashExpense") setEntry((current) => ({ ...current, entryDate: today, type: "despesa", paymentMethod: "dinheiro", status: "pago", dueDate: "", installments: 1, installmentIntervalDays: 30, installmentAmounts: [], category: "Gasto dinheiro", description: current.category === "Gasto dinheiro" ? current.description : "" }));
    if (kind === "payable") setEntry((current) => ({ ...current, deliveryDate: current.deliveryDate || today, entryDate: today, type: "despesa", paymentMethod: "boleto", status: "pendente", dueDate: current.dueDate || today, category: current.category === "Venda dinheiro" || current.category === "Gasto dinheiro" ? "" : current.category }));
  }

  function dateAfterDelivery(date: string, days: number) {
    const [year, month, day] = date.split("-").map(Number);
    const next = new Date(year, month - 1, day + Math.max(1, days));
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
  }

  function setInstallments(value: number) {
    const installments = Math.max(1, Math.min(36, value || 1));
    setEntry((current) => ({ ...current, installments, installmentAmounts: current.installmentAmounts.slice(0, installments) }));
  }

  function setInstallmentAmount(index: number, value: string) {
    setEntry((current) => {
      const installmentAmounts = Array.from({ length: current.installments }, (_, itemIndex) => current.installmentAmounts[itemIndex] ?? "");
      installmentAmounts[index] = value;
      return { ...current, installmentAmounts };
    });
  }

  function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
    return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Imagem invalida.")), type, quality));
  }

  function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("Nao foi possivel ler a imagem."));
      reader.readAsDataURL(blob);
    });
  }

  async function optimizeProofImage(file: File) {
    const source = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      const limit = 1600;
      const scale = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Nao foi possivel processar a imagem.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, width, height);
      return blobToDataUrl(await canvasBlob(canvas, "image/jpeg", 0.82));
    } finally {
      URL.revokeObjectURL(source);
    }
  }

  async function attachProof(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    if (entry.proofImages.length + files.length > 8) return setActionError("Use ate 8 comprovantes por lancamento.");
    if (files.some((file) => file.size > 10000_000)) return setActionError("Use fotos de ate 10 MB cada.");
    setProofBusy(true);
    setActionError("");
    try {
      const proofImages = await Promise.all(files.map(async (file) => ({
        name: file.name.replace(/\.[^.]+$/, "") + "-otimizado.jpg",
        dataUrl: await optimizeProofImage(file),
      })));
      setEntry((current) => {
        const nextProofs = [...current.proofImages, ...proofImages];
        return { ...current, proofImages: nextProofs, proofImageName: nextProofs[0]?.name ?? "", proofImageDataUrl: nextProofs[0]?.dataUrl ?? "" };
      });
    } catch {
      setActionError("Nao foi possivel otimizar a imagem. Tente outra foto.");
    } finally {
      setProofBusy(false);
      event.target.value = "";
    }
  }

  function removeProof(index: number) {
    setEntry((current) => {
      const proofImages = current.proofImages.filter((_, itemIndex) => itemIndex !== index);
      return { ...current, proofImages, proofImageName: proofImages[0]?.name ?? "", proofImageDataUrl: proofImages[0]?.dataUrl ?? "" };
    });
  }

  async function submitEntry(event: FormEvent) {
    event.preventDefault();
    setActionError("");
    const openCash = snapshot?.openCash ?? null;
    const type = launchKind === "cashSale" ? "receita" : launchKind === "cashExpense" || launchKind === "payable" ? "despesa" : entry.type;
    const paymentMethod = launchKind === "cashSale" || launchKind === "cashExpense" ? "dinheiro" : launchKind === "payable" ? "boleto" : entry.paymentMethod;
    const status = launchKind === "payable" ? "pendente" : launchKind === "cashSale" || launchKind === "cashExpense" ? "pago" : entry.status;
    const installments = launchKind === "payable" || launchKind === "other" ? entry.installments : 1;
    const entryDate = launchKind === "other" ? entry.entryDate : today;
    const payableInitialDueDate = entry.dueDate || today;
    const category = launchKind === "cashSale" ? "Venda dinheiro" : launchKind === "cashExpense" ? "Gasto dinheiro" : entry.category.trim();
    const description = entry.description.trim() || (launchKind === "cashSale" ? "Venda em dinheiro" : category);
    const installmentAmounts = entry.installmentAmounts.filter((value) => value.trim()).length
      ? Array.from({ length: installments }, (_, index) => moneyNumber(entry.installmentAmounts[index] ?? ""))
      : undefined;
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
        installmentAmounts,
        category,
        description,
        supplier: "",
        amount: moneyNumber(entry.amount),
        dueDate: launchKind === "payable" ? payableInitialDueDate : launchKind === "other" ? entry.dueDate || null : null,
        proofImages: entry.proofImages,
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
            <div className={launchKind === "other" ? "grid grid-cols-2 gap-3" : "grid gap-3"}>{launchKind === "other" && <label>Data<input type="date" value={entry.entryDate} onChange={(event) => setEntry({ ...entry, entryDate: event.target.value })} required /></label>}<label>Valor total<input inputMode="decimal" placeholder="0,00" value={entry.amount} onChange={(event) => setEntry({ ...entry, amount: event.target.value })} required /></label></div>
            {!(launchKind === "cashSale" || launchKind === "cashExpense") && <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_44px]"><label>Fornecedor / tipo<select value={entry.category} onChange={(event) => setEntry({ ...entry, category: event.target.value })} required><option value="">Selecione uma categoria</option>{snapshot.categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label><button className="mt-6 grid h-11 w-11 place-items-center rounded-xl bg-orange-500 text-2xl font-black leading-none text-white" type="button" title="Criar categoria" onClick={() => setCreatingCategory((current) => !current)}>+</button></div>}
            {creatingCategory && <div className="mb-3 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto]"><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Coca Cola, Cafe da manha, Almoco" /><button className="rounded-xl bg-slate-900 px-4 py-2 font-black text-white" type="button" onClick={createCategory}>Salvar</button></div>}
            {launchKind === "cashSale" ? <label>O que entrou<select value={entry.description} onChange={(event) => setEntry({ ...entry, description: event.target.value })} required><option value="">Selecione o tipo</option>{cashSaleDescriptions.map((description) => <option key={description} value={description}>{description}</option>)}</select></label> : launchKind === "cashExpense" ? <label>Onde foi gasto<select value={entry.description} onChange={(event) => setEntry({ ...entry, description: event.target.value })} required><option value="">Selecione uma categoria</option>{cashExpenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label> : <label>Descricao<input value={entry.description} onChange={(event) => setEntry({ ...entry, description: event.target.value })} placeholder="Opcional" /></label>}
            {launchKind === "payable" && <div className="grid gap-3 sm:grid-cols-3"><label>Forma<select value={entry.paymentMethod} onChange={(event) => setEntry({ ...entry, paymentMethod: event.target.value as PaymentMethod })}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartao</option><option value="boleto">Boleto</option><option value="outro">Outro</option></select></label><label>Data da entrega<input type="date" value={entry.deliveryDate} onChange={(event) => setEntry({ ...entry, deliveryDate: event.target.value })} required /></label><label>Vencimento inicial<input type="date" value={entry.dueDate} onChange={(event) => setEntry({ ...entry, dueDate: event.target.value })} required /></label></div>}
            {launchKind === "other" && <div className="grid grid-cols-2 gap-3"><label>Forma<select value={entry.paymentMethod} onChange={(event) => setEntry({ ...entry, paymentMethod: event.target.value as PaymentMethod })}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartao</option><option value="boleto">Boleto</option><option value="outro">Outro</option></select></label><label>Vencimento original inicial<input type="date" value={entry.dueDate} onChange={(event) => setEntry({ ...entry, dueDate: event.target.value })} /></label></div>}
            {launchKind === "payable" && <div className={entry.installments > 1 ? "grid grid-cols-2 gap-3" : "grid gap-3"}><label>Parcelas<input min="1" max="36" type="number" value={entry.installments} onChange={(event) => setInstallments(Number(event.target.value))} /></label>{entry.installments > 1 && <label>Dias entre parcelas<input min="1" max="365" type="number" value={entry.installmentIntervalDays} onChange={(event) => setEntry({ ...entry, installmentIntervalDays: Number(event.target.value) })} /></label>}</div>}
            {launchKind === "payable" && <p className="mb-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">{entry.installments > 1 ? `Primeiro vencimento original: ${entry.dueDate || "-"}. Proximo vencimento original: ${entry.dueDate ? dateAfterDelivery(entry.dueDate, entry.installmentIntervalDays) : "-"}. O intervalo e contado a partir do vencimento anterior; se cair em dia nao util, o sistema joga para o proximo dia util e grava as duas datas.` : `Vencimento original: ${entry.dueDate || "-"}. Se cair em dia nao util, o sistema joga para o proximo dia util e grava as duas datas.`}</p>}
            {launchKind === "payable" && entry.installments > 1 && <div className="mb-3 rounded-xl bg-slate-50 p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Valores por parcela</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {Array.from({ length: entry.installments }, (_, index) => <label className="mb-0 text-xs" key={index}>Parcela {index + 1}<input inputMode="decimal" placeholder="Opcional" value={entry.installmentAmounts[index] ?? ""} onChange={(event) => setInstallmentAmount(index, event.target.value)} /></label>)}
              </div>
            </div>}
            {(launchKind === "cashExpense" || launchKind === "payable" || launchKind === "other") && <><label>Referencia<input value={entry.documentNumber} onChange={(event) => setEntry({ ...entry, documentNumber: event.target.value })} placeholder="Nota, boleto, recibo" /></label><label>Comprovantes<input accept="image/*" multiple type="file" onChange={attachProof} /></label>{proofBusy && <p className="mb-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">Otimizando imagens...</p>}{entry.proofImages.length > 0 && <div className="mb-3 space-y-2 rounded-xl bg-emerald-50 p-3">{entry.proofImages.map((proof, index) => <div className="flex items-center justify-between gap-3 text-sm font-bold text-emerald-700" key={`${proof.name}-${index}`}><span className="truncate">{proof.name}</span><button className="rounded-lg bg-white px-2 py-1 text-xs font-black text-emerald-700" type="button" onClick={() => removeProof(index)}>Remover</button></div>)}</div>}<label>Detalhes<textarea value={entry.documentNote} onChange={(event) => setEntry({ ...entry, documentNote: event.target.value })} placeholder="Itens, observacoes ou calculo do fornecedor" /></label></>}
            {actionError && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{actionError}</p>}
            <button className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-white" disabled={proofBusy}>{proofBusy ? "Aguarde a imagem" : "Salvar lancamento"}</button>
          </div>
        </form>
      </div>}
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <LaunchMetric label="Entradas pagas" value={money(launchTotals.revenueTotal)} hint={`${launchTotals.revenueCount} lancamento(s) recebido(s)`} tone="good" />
          <LaunchMetric label="Saidas pagas" value={money(launchTotals.expenseTotal)} hint={`${launchTotals.expenseCount} lancamento(s) quitado(s)`} tone="bad" />
          <LaunchMetric label="Saldo pago" value={money(launchTotals.balanceTotal)} hint={`${launchTotals.totalCount} lancamento(s) no periodo`} tone={launchTotals.balanceTotal < 0 ? "bad" : "good"} />
          <LaunchMetric label="Em aberto" value={money(launchTotals.pendingTotal)} hint={`${launchTotals.pendingCount} lancamento(s) pendente(s)`} tone="warn" />
        </section>
        <EntryTable entries={snapshot.entries.filter((entry) => entry.status !== "pago")} onCancel={(id) => setStatus(id, "cancelado")} showStatus />
      </div>
    </div>}
  </FinanceShell>;
}
