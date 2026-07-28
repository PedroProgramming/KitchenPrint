import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createShoppingItem, listShoppingItems, updateShoppingItemStatus, type ShoppingPriority, type ShoppingStatus, type ShoppingTarget } from "@/lib/database";

const targets = ["cozinha", "salao", "copa"];
const priorities = ["normal", "urgente"];
const statuses = ["comprado", "cancelado"];

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  if (user.role !== "admin" && !user.area) return NextResponse.json({ error: "Usuário sem área configurada" }, { status: 403 });
  return NextResponse.json(await listShoppingItems(user.role === "admin" ? undefined : user.area!));
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  const input = await request.json() as { target?: ShoppingTarget; name?: string; quantity?: number; unit?: string; priority?: ShoppingPriority; note?: string };
  const target = user.role === "admin" ? input.target : user.area;
  const quantity = Number(input.quantity);
  if (!targets.includes(target ?? "") || !input.name?.trim() || !Number.isFinite(quantity) || quantity <= 0 || !input.unit?.trim() || !priorities.includes(input.priority ?? "")) {
    return NextResponse.json({ error: "Informe setor, item, quantidade, unidade e prioridade." }, { status: 400 });
  }
  try {
    await createShoppingItem({ target: target!, name: input.name, quantity, unit: input.unit, priority: input.priority!, note: input.note ?? "", requestedBy: user.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel adicionar o item." }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const input = await request.json() as { id?: string; status?: ShoppingStatus };
  if (!input.id || !statuses.includes(input.status ?? "")) return NextResponse.json({ error: "Informe item e status validos." }, { status: 400 });
  try {
    await updateShoppingItemStatus({ id: input.id, status: input.status as Exclude<ShoppingStatus, "pendente">, resolvedBy: user.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel atualizar o item." }, { status: 409 });
  }
}
