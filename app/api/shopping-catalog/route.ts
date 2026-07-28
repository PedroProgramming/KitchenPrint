import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createShoppingCatalogItem, deleteShoppingCatalogItem, listShoppingCatalog, updateShoppingCatalogItem, type ShoppingTarget } from "@/lib/database";

const targets = ["cozinha", "salao", "copa"];

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  const target = user.role === "admin" ? undefined : user.area ?? undefined;
  return NextResponse.json(await listShoppingCatalog(target, user.role === "admin"));
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const input = await request.json() as { target?: ShoppingTarget; category?: string; name?: string; defaultUnit?: string };
  if (!targets.includes(input.target ?? "") || !input.category?.trim() || !input.name?.trim() || !input.defaultUnit?.trim()) return NextResponse.json({ error: "Informe área, categoria, item e unidade." }, { status: 400 });
  try { await createShoppingCatalogItem({ target: input.target!, category: input.category, name: input.name, defaultUnit: input.defaultUnit }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Não foi possível cadastrar o item." }, { status: 409 }); }
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const input = await request.json() as { id?: string; target?: ShoppingTarget; category?: string; name?: string; defaultUnit?: string; active?: boolean };
  if (!input.id || !targets.includes(input.target ?? "") || !input.category?.trim() || !input.name?.trim() || !input.defaultUnit?.trim() || typeof input.active !== "boolean") return NextResponse.json({ error: "Informe os dados válidos do item." }, { status: 400 });
  try { await updateShoppingCatalogItem({ id: input.id, target: input.target!, category: input.category, name: input.name, defaultUnit: input.defaultUnit, active: input.active }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Não foi possível atualizar o item." }, { status: 409 }); }
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const input = await request.json() as { id?: string };
  if (!input.id) return NextResponse.json({ error: "Informe o item." }, { status: 400 });
  try { await deleteShoppingCatalogItem(input.id); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Não foi possível desativar o item." }, { status: 409 }); }
}
