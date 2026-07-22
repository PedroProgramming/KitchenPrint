import { NextResponse } from "next/server";
import { createTable, listTables, type Area } from "@/lib/database";
import { currentUser } from "@/lib/auth";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  return NextResponse.json(await listTables(user));
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const input = await request.json();
  const number = Number(input.number);
  if (!Number.isInteger(number) || number < 1 || !["salao", "copa"].includes(input.area)) return NextResponse.json({ error: "Informe numero e area validos." }, { status: 400 });
  try { await createTable({ number, name: String(input.name ?? ""), area: input.area as Area }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Essa mesa ja esta cadastrada." }, { status: 409 }); }
}
