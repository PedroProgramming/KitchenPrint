import { NextResponse } from "next/server";
import { createMenuItem, listMenuItems } from "@/lib/database";
import { currentUser } from "@/lib/auth";

export async function GET() {
  if (!await currentUser()) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  return NextResponse.json(await listMenuItems());
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const input = await request.json() as { name?: string; price?: number; kind?: "Prato" | "Bebida" };
  if (!input.name?.trim() || !Number.isFinite(Number(input.price)) || Number(input.price) < 0 || !["Prato", "Bebida"].includes(input.kind ?? "")) return NextResponse.json({ error: "Informe nome, tipo e preço válidos." }, { status: 400 });
  try { await createMenuItem({ name: input.name, price: Number(input.price), kind: input.kind as "Prato" | "Bebida" }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Não foi possível cadastrar o prato." }, { status: 409 }); }
}
