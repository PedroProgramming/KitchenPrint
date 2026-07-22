import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { allowedTable } from "@/lib/database";
import { enqueueKitchenOrder } from "@/lib/print";
import type { KitchenItem } from "@/lib/escpos";

type PrintItem = KitchenItem;

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await request.json() as { table?: number; items?: PrintItem[] };
  if (!body.table || !await allowedTable(user, body.table)) return NextResponse.json({ error: "Você não tem acesso a esta mesa." }, { status: 403 });
  const kitchenItems = body.items?.filter((item) => item.kind === "Prato") ?? [];
  if (!body.table || !kitchenItems.length) return NextResponse.json({ error: "Não há pratos para imprimir" }, { status: 400 });

  let jobId = "";
  try {
    jobId = await enqueueKitchenOrder(body.table, kitchenItems);
  } catch (error) {
    console.error("Falha na impressao", error);
    return NextResponse.json({ error: "Não foi possível enviar o pedido para a impressora." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, queued: true, jobId });
}
