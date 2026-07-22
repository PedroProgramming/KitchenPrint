import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/database";
export async function POST() { const jar = await cookies(); const token = jar.get("kprint_session")?.value; if (token) await deleteSession(token); const response = NextResponse.json({ ok: true }); response.cookies.delete("kprint_session"); return response; }
