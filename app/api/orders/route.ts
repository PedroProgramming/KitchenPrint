import { NextResponse } from "next/server";
import { getOrders, saveOrders, type StoredItem } from "@/lib/database";
import { currentUser } from "@/lib/auth";

export async function GET() { const user = await currentUser(); if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 }); return NextResponse.json(await getOrders(user)); }

export async function PUT(request: Request) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const orders = await request.json() as Record<string, StoredItem[]>;
  await saveOrders(orders, user);
  return NextResponse.json({ ok: true });
}
