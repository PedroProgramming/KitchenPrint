import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import crypto from "node:crypto";
import { closeCashRegister, createFinanceCategory, createFinanceEntry, deleteFinanceEntry, getFinanceSnapshot, openCashRegister, updateFinanceEntryStatus, type FinanceEntryType, type FinancePaymentMethod, type FinanceStatus } from "@/lib/database";

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const entryTypes = ["receita", "despesa"];
const paymentMethods = ["dinheiro", "pix", "cartao", "boleto", "outro"];
const statuses = ["pago", "pendente", "cancelado"];
const addDays = (date: string, days: number) => {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(year, month - 1, day + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
};

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to)) return NextResponse.json({ error: "Periodo invalido" }, { status: 400 });
  try {
    return NextResponse.json(await getFinanceSnapshot(from, to));
  } catch {
    return NextResponse.json({ error: "Nao foi possivel carregar o financeiro. Confira se a migration foi aplicada no Supabase." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const input = await request.json() as {
    action?: "open-cash" | "entry" | "category";
    businessDate?: string;
    openingAmount?: number;
    notes?: string;
    cashRegisterId?: string | null;
    entryDate?: string;
    type?: FinanceEntryType;
    category?: string;
    description?: string;
    amount?: number;
    paymentMethod?: FinancePaymentMethod;
    status?: FinanceStatus;
    dueDate?: string | null;
    supplier?: string;
    documentNumber?: string;
    documentNote?: string;
    proofImageName?: string;
    proofImageDataUrl?: string;
    installments?: number;
    installmentIntervalDays?: number;
    categoryName?: string;
  };

  try {
    if (input.action === "open-cash") {
      const amount = Number(input.openingAmount);
      if (!input.businessDate || !validDate(input.businessDate) || !Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: "Informe data e valor inicial validos." }, { status: 400 });
      await openCashRegister({ businessDate: input.businessDate, openingAmount: amount, openedBy: user.id, notes: input.notes });
      return NextResponse.json({ ok: true });
    }

    if (input.action === "entry") {
      const amount = Number(input.amount);
      const installments = Math.max(1, Math.min(36, Number(input.installments || 1)));
      const installmentIntervalDays = Math.max(1, Math.min(365, Number(input.installmentIntervalDays || 30)));
      if (!input.entryDate || !validDate(input.entryDate) || !entryTypes.includes(input.type ?? "") || !input.category?.trim() || !Number.isFinite(amount) || amount <= 0 || !paymentMethods.includes(input.paymentMethod ?? "") || !statuses.includes(input.status ?? "")) {
        return NextResponse.json({ error: "Informe data, tipo, categoria, valor, forma e status validos." }, { status: 400 });
      }
      if (input.dueDate && !validDate(input.dueDate)) return NextResponse.json({ error: "Vencimento invalido." }, { status: 400 });
      const groupId = installments > 1 ? crypto.randomUUID() : null;
      const installmentAmount = Math.round((amount / installments) * 100) / 100;
      for (let index = 0; index < installments; index += 1) {
        const currentAmount = index === installments - 1 ? Math.round((amount - installmentAmount * (installments - 1)) * 100) / 100 : installmentAmount;
        await createFinanceEntry({
          cashRegisterId: input.cashRegisterId,
          entryDate: input.entryDate,
          type: input.type!,
          category: input.category,
          description: input.description?.trim() || input.category,
          amount: currentAmount,
          paymentMethod: input.paymentMethod!,
          status: input.status!,
          dueDate: input.dueDate ? addDays(input.dueDate, installmentIntervalDays * index) : null,
          supplier: input.supplier,
          documentNumber: input.documentNumber,
          documentNote: input.documentNote,
          proofImageName: input.proofImageName,
          proofImageDataUrl: input.proofImageDataUrl,
          installmentGroupId: groupId,
          installmentNumber: index + 1,
          installmentTotal: installments,
          createdBy: user.id,
        });
      }
      if (input.category?.trim()) await createFinanceCategory(input.category);
      return NextResponse.json({ ok: true });
    }

    if (input.action === "category") {
      await createFinanceCategory(input.categoryName ?? "");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel salvar o financeiro." }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const input = await request.json() as { action?: "close-cash" | "entry-status"; id?: string; closingAmount?: number; notes?: string; status?: FinanceStatus };

  try {
    if (input.action === "close-cash") {
      const amount = Number(input.closingAmount);
      if (!input.id || !Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: "Informe caixa e valor final validos." }, { status: 400 });
      await closeCashRegister({ id: input.id, closingAmount: amount, closedBy: user.id, notes: input.notes });
      return NextResponse.json({ ok: true });
    }

    if (input.action === "entry-status") {
      if (!input.id || !statuses.includes(input.status ?? "")) return NextResponse.json({ error: "Informe lancamento e status validos." }, { status: 400 });
      await updateFinanceEntryStatus({ id: input.id, status: input.status! });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel atualizar o financeiro." }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const input = await request.json() as { id?: string };
  if (!input.id) return NextResponse.json({ error: "Informe o lancamento." }, { status: 400 });

  try {
    await deleteFinanceEntry(input.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel remover o lancamento." }, { status: 409 });
  }
}
