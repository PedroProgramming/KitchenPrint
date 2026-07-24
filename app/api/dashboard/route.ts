import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { dashboardStatsForDate, dashboardStatsForRange } from "@/lib/database";

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? undefined;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  if (date && !validDate(date)) return NextResponse.json({ error: "Data invalida" }, { status: 400 });
  if ((from && !validDate(from)) || (to && !validDate(to))) return NextResponse.json({ error: "Periodo invalido" }, { status: 400 });
  if (from && to && from > to) return NextResponse.json({ error: "Periodo invalido" }, { status: 400 });

  if (from || to) return NextResponse.json(await dashboardStatsForRange(from, to));
  return NextResponse.json(await dashboardStatsForDate(date));
}
