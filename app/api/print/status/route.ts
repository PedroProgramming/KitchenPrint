import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getPrintJobStatus } from "@/lib/database";

export async function GET(request: Request) {
  if (!await currentUser()) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Trabalho invalido" }, { status: 400 });
  const job = await getPrintJobStatus(id);
  return job ? NextResponse.json(job) : NextResponse.json({ error: "Trabalho nao encontrado" }, { status: 404 });
}
