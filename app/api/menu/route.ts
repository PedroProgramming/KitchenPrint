import { NextResponse } from "next/server";
import { createMenuItem, deleteMenuItem, listMenuItems, updateMenuItem } from "@/lib/database";
import { currentUser } from "@/lib/auth";

type MenuInput = { id?: string; name?: string; price?: number; kind?: "Prato" | "Bebida" };

function validMenuInput(input: MenuInput) {
  return Boolean(input.name?.trim()) && Number.isFinite(Number(input.price)) && Number(input.price) >= 0 && ["Prato", "Bebida"].includes(input.kind ?? "");
}

export async function GET() {
  if (!await currentUser()) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  return NextResponse.json(await listMenuItems());
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const input = await request.json() as MenuInput;
  if (!validMenuInput(input)) return NextResponse.json({ error: "Informe nome, tipo e preco validos." }, { status: 400 });
  try {
    await createMenuItem({ name: input.name!, price: Number(input.price), kind: input.kind as "Prato" | "Bebida" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel cadastrar o item." }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const input = await request.json() as MenuInput;
  if (!input.id || !validMenuInput(input)) return NextResponse.json({ error: "Informe item, nome, tipo e preco validos." }, { status: 400 });
  try {
    await updateMenuItem(input.id, { name: input.name!, price: Number(input.price), kind: input.kind as "Prato" | "Bebida" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel atualizar o item." }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const input = await request.json() as { id?: string };
  if (!input.id) return NextResponse.json({ error: "Informe o item que deve ser removido." }, { status: 400 });
  try {
    await deleteMenuItem(input.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel remover o item." }, { status: 409 });
  }
}
