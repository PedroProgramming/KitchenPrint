import { NextResponse } from "next/server";
import { createSession, findUser } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const user = await findUser(String(username ?? ""), String(password ?? ""));
    if (!user) return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
    const response = NextResponse.json({ user });
    response.cookies.set("kprint_session", await createSession(user.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 12, path: "/" });
    return response;
  } catch (error) {
    console.error("Falha no login:", error);
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Erro interno no login.";
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Erro interno no login." : message }, { status: 500 });
  }
}
