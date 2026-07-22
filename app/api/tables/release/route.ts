import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { releaseTable } from "@/lib/database";
export async function POST(request: Request) { const user = await currentUser(); if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 }); if (user.role !== "admin") return NextResponse.json({ error: "Somente o administrador pode liberar mesas." }, { status: 403 }); const { table } = await request.json(); if (!Number.isInteger(table)) return NextResponse.json({ error: "Mesa inválida" }, { status: 400 }); await releaseTable(table, user); return NextResponse.json({ ok: true }); }
