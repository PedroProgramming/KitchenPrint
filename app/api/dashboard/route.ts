import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { dashboardStatsForDate } from "@/lib/database";
export async function GET(request: Request) { const user = await currentUser(); if (!user || user.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 }); const date = new URL(request.url).searchParams.get("date") ?? undefined; if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Data invalida" }, { status: 400 }); return NextResponse.json(await dashboardStatsForDate(date)); }
