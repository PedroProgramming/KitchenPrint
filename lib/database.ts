import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export type Role = "admin" | "garcom"; export type Area = "salao" | "copa";
export type RestaurantTable = { id: string; number: number; name: string; area: Area; active: boolean };
export type StoredItem = { id: string; name: string; kind: "Prato" | "Bebida"; quantity: number; note: string; printedQuantity?: number };
export type MenuItem = { id: string; name: string; price: number; kind: "Prato" | "Bebida"; active: boolean };
export type User = { id: string; name: string; username: string; role: Role; area: Area | null; tables: number[] };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) console.warn("Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
const db = createClient(url ?? "https://invalid.supabase.co", key ?? "invalid", { auth: { autoRefreshToken: false, persistSession: false } });
function mapUser(row: any): User { return { id: row.id, name: row.name, username: row.username, role: row.role, area: row.area ?? null, tables: row.tables_json ?? [] }; }
export async function listTables(user: User) { const { data, error } = await db.from("restaurant_tables").select("id,number,name,area,active").eq("active", true).order("number"); if (error) throw error; return (data ?? []).filter((table) => user.role === "admin" || table.area === user.area).map((table) => ({ ...table, number: Number(table.number) })) as RestaurantTable[]; }
export async function createTable(input: { number: number; name: string; area: Area }) { const { error } = await db.from("restaurant_tables").insert({ number: input.number, name: input.name.trim() || `Mesa ${input.number}`, area: input.area }); if (error) throw error; }
export async function allowedTable(user: User, table: number) {
  if (user.role === "admin") return true;
  const { data, error } = await db.from("restaurant_tables").select("number").eq("number", table).eq("area", user.area).eq("active", true).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
export async function findUser(username: string, password: string) {
  const { data, error } = await db.from("users").select("*").eq("username", username.trim().toLowerCase()).maybeSingle();
  if (error) throw error;
  if (!data?.password_hash) return null;
  return await bcrypt.compare(password, data.password_hash) ? mapUser(data) : null;
}
export async function createSession(userId: string) { const token = crypto.randomBytes(32).toString("hex"); const { error } = await db.from("sessions").insert({ token, user_id: userId, expires_at: Date.now() + 1000 * 60 * 60 * 12 }); if (error) throw error; return token; }
export async function getUserBySession(token?: string) { if (!token) return null; const { data } = await db.from("sessions").select("user_id, users(*)").eq("token", token).gt("expires_at", Date.now()).maybeSingle(); return data?.users ? mapUser(data.users) : null; }
export async function deleteSession(token: string) { await db.from("sessions").delete().eq("token", token); }
export async function getOrders(user: User) { const { data, error } = await db.from("table_orders").select("table_number,items_json"); if (error) throw error; const accessible = user.role === "admin" ? null : new Set((await listTables(user)).map((table) => table.number)); return Object.fromEntries((data ?? []).filter((row) => !accessible || accessible.has(Number(row.table_number))).map((row) => [row.table_number, row.items_json])); }
function addedItems(previous: StoredItem[], current: StoredItem[]) {
  return current.flatMap((item) => {
    const old = previous.find((candidate) => candidate.id === item.id);
    if (!old) return [item];
    const increase = item.quantity - old.quantity;
    return increase > 0 ? [{ ...item, quantity: increase }] : [];
  });
}
export async function saveOrders(orders: Record<string, StoredItem[]>, user: User) {
  for (const [table, items] of Object.entries(orders)) {
    const number = Number(table);
    if (!await allowedTable(user, number)) continue;
    const current = await db.from("table_orders").select("items_json").eq("table_number", number).maybeSingle();
    if (current.error) throw current.error;
    const previous = (current.data?.items_json ?? []) as StoredItem[];
    if (items.length) {
      let { data: session } = await db.from("service_sessions").select("id").eq("table_number", number).is("released_at", null).maybeSingle();
      if (!session) {
        const created = await db.from("service_sessions").insert({ table_number: number, opened_by: user.id, area: user.area }).select("id").single();
        if (created.error) throw created.error;
        session = created.data;
      }
      const saved = await db.from("table_orders").upsert({ table_number: number, items_json: items, opened_by: user.id });
      if (saved.error) throw saved.error;
      const additions = addedItems(previous, items);
      const confirmations = items.filter((item) => item.kind === "Prato" && Number(item.printedQuantity ?? 0) >= Number(item.quantity || 0) && Number(previous.find((old) => old.id === item.id)?.printedQuantity ?? 0) < Number(item.quantity || 0));
      if (additions.length) {
        const logged = await db.from("consumption_logs").insert({ session_id: session.id, table_number: number, user_id: user.id, items_json: additions });
        if (logged.error) throw logged.error;
      }
      if (confirmations.length) {
        const confirmed = await db.from("consumption_logs").insert({ session_id: session.id, table_number: number, user_id: user.id, items_json: confirmations });
        if (confirmed.error) throw confirmed.error;
      }
    } else {
      const removed = await db.from("table_orders").delete().eq("table_number", number);
      if (removed.error) throw removed.error;
    }
  }
}
export async function releaseTable(table: number, user: User) {
  if (user.role !== "admin" || !await allowedTable(user, table)) throw new Error("Acesso negado");
  const current = await db.from("table_orders").select("items_json").eq("table_number", table).maybeSingle();
  if (current.error) throw current.error;
  const now = new Date().toISOString();
  const closed = await db.from("service_sessions").update({ released_by: user.id, released_at: now, closed_items_json: current.data?.items_json ?? [] }).eq("table_number", table).is("released_at", null);
  if (closed.error) throw closed.error;
  const removed = await db.from("table_orders").delete().eq("table_number", table);
  if (removed.error) throw removed.error;
  const event = await db.from("table_events").insert({ table_number: table, user_id: user.id, action: "liberada" });
  if (event.error) throw event.error;
}
export async function listUsers() { const { data } = await db.from("users").select("*").order("name"); return (data ?? []).map(mapUser); }
export async function createUser(input: { name: string; username: string; password: string; role: Role; area: Area; tables: number[] }) { const { error } = await db.from("users").insert({ name: input.name.trim(), username: input.username.trim().toLowerCase(), password_hash: await bcrypt.hash(input.password, 10), role: input.role, area: input.area, tables_json: input.tables }); if (error) throw error; }
export async function listUsersWithStats() { const users = await listUsers(); const { data: tables, error } = await db.from("restaurant_tables").select("number,area").eq("active", true); if (error) throw error; return users.map((user) => ({ ...user, tablesCount: user.role === "admin" ? (tables ?? []).length : (tables ?? []).filter((table) => table.area === user.area).length })); }
export async function listMenuItems() { const { data, error } = await db.from("menu_items").select("id,name,price,kind,active").eq("active", true).order("kind").order("name"); if (error) throw error; return (data ?? []).map((item) => ({ ...item, price: Number(item.price) })) as MenuItem[]; }
export async function createMenuItem(input: { name: string; price: number; kind: "Prato" | "Bebida" }) { const { error } = await db.from("menu_items").insert({ name: input.name.trim(), price: input.price, kind: input.kind }); if (error) throw error; }
export async function updateMenuItem(id: string, input: { name: string; price: number; kind: "Prato" | "Bebida" }) { const { error } = await db.from("menu_items").update({ name: input.name.trim(), price: input.price, kind: input.kind }).eq("id", id); if (error) throw error; }
export async function deleteMenuItem(id: string) { const { error } = await db.from("menu_items").delete().eq("id", id); if (error) throw error; }
export async function updateUser(id: string, input: { name: string; username: string; area: Area; password?: string }) { const values: Record<string, unknown> = { name: input.name.trim(), username: input.username.trim().toLowerCase(), area: input.area }; if (input.password?.trim()) values.password_hash = await bcrypt.hash(input.password, 10); const { error } = await db.from("users").update(values).eq("id", id).eq("role", "garcom"); if (error) throw error; }
export async function getPrintJobStatus(id: string) { const { data, error } = await db.from("print_jobs").select("status,error_message").eq("id", id).maybeSingle(); if (error) throw error; return data; }
export async function dashboardStats() { const { data, error } = await db.from("service_sessions").select("id,table_number,area,opened_at,released_at,opened_by,users!service_sessions_opened_by_fkey(name,username)").order("opened_at", { ascending: false }); if (error) throw error; const sessions = (data ?? []) as any[]; const byWaiter = new Map<string, { name: string; area: string; tables: number; totalMinutes: number }>(); let totalMinutes = 0; let closed = 0; for (const session of sessions) { const key = String(session.opened_by); const name = session.users?.name ?? session.users?.username ?? "Usuário"; const current = byWaiter.get(key) ?? { name, area: session.area ?? "salao", tables: 0, totalMinutes: 0 }; current.tables += 1; if (session.released_at) { const minutes = Math.max(0, (new Date(session.released_at).getTime() - new Date(session.opened_at).getTime()) / 60000); current.totalMinutes += minutes; totalMinutes += minutes; closed += 1; } byWaiter.set(key, current); } return { totalTables: sessions.length, openTables: sessions.length - closed, closedTables: closed, averageMinutes: closed ? Math.round(totalMinutes / closed) : 0, byWaiter: [...byWaiter.values()].map((row) => ({ ...row, averageMinutes: row.tables ? Math.round(row.totalMinutes / row.tables) : 0 })).sort((a, b) => b.tables - a.tables), recent: sessions.slice(0, 20) }; }
export async function dashboardStatsForDate(date?: string) {
  return dashboardStatsForRange(date, date);
}

export async function dashboardStatsForRange(from?: string, to?: string) {
  const start = from ? `${from}T00:00:00.000Z` : undefined;
  const end = to ? `${to}T23:59:59.999Z` : undefined;
  let query = db.from("service_sessions").select("id,table_number,area,opened_at,released_at,opened_by,closed_items_json,users!service_sessions_opened_by_fkey(name,username)").order("opened_at", { ascending: false });
  if (start && end) query = query.or(`released_at.gte.${start},released_at.is.null`).or(`released_at.lte.${end},released_at.is.null`);
  const { data, error } = await query;
  if (error) throw error;
  const sessions = (data ?? []) as any[];
  const closedSessions = sessions.filter((session) => session.released_at && (!start || new Date(session.released_at) >= new Date(start)) && (!end || new Date(session.released_at) <= new Date(end)));
  const dishesByWaiter = new Map<string, number>();
  const byDish = new Map<string, { name: string; quantity: number; orders: number; tables: Set<number> }>();
  const sessionsMissingSnapshot = closedSessions.filter((session) => !Array.isArray(session.closed_items_json) || !session.closed_items_json.length);
  function addDishStats(items: StoredItem[], tableNumber: number) {
    for (const item of items.filter((entry) => entry.kind === "Prato")) {
      const key = item.name.trim().toLowerCase();
      const current = byDish.get(key) ?? { name: item.name, quantity: 0, orders: 0, tables: new Set<number>() };
      current.quantity += Number(item.quantity || 0);
      current.orders += 1;
      current.tables.add(Number(tableNumber));
      byDish.set(key, current);
    }
  }
  for (const session of closedSessions) {
    const finalItems = (session.closed_items_json ?? []) as StoredItem[];
    addDishStats(finalItems, Number(session.table_number));
    const dishes = finalItems.filter((item) => item.kind === "Prato").reduce((total, item) => total + Number(item.quantity || 0), 0);
    dishesByWaiter.set(String(session.opened_by), (dishesByWaiter.get(String(session.opened_by)) ?? 0) + dishes);
  }
  if (sessionsMissingSnapshot.length) {
    const { data: logs, error: logsError } = await db.from("consumption_logs").select("session_id,items_json").in("session_id", sessionsMissingSnapshot.map((session) => session.id));
    if (logsError) throw logsError;
    const waiterBySession = new Map(sessionsMissingSnapshot.map((session) => [session.id, String(session.opened_by)]));
    const logsBySession = new Map<string, any[]>();
    for (const log of logs ?? []) logsBySession.set(log.session_id, [...(logsBySession.get(log.session_id) ?? []), log]);
    for (const [sessionId, sessionLogs] of logsBySession) {
      const waiterId = waiterBySession.get(sessionId);
      if (!waiterId) continue;
      const tableNumber = Number(sessionsMissingSnapshot.find((session) => session.id === sessionId)?.table_number ?? 0);
      const hasConfirmation = sessionLogs.some((log) => ((log.items_json ?? []) as StoredItem[]).some((item) => item.kind === "Prato" && Number(item.printedQuantity ?? 0) >= Number(item.quantity || 0)));
      const fallbackItems = sessionLogs.flatMap((log) => (log.items_json ?? []) as StoredItem[]).filter((item) => item.kind === "Prato" && (!hasConfirmation || Number(item.printedQuantity ?? 0) >= Number(item.quantity || 0)));
      addDishStats(fallbackItems, tableNumber);
      const dishes = fallbackItems.reduce((total, item) => total + Number(item.quantity || 0), 0);
      dishesByWaiter.set(waiterId, (dishesByWaiter.get(waiterId) ?? 0) + dishes);
    }
  }
  const byWaiter = new Map<string, { name: string; area: string; tables: number; dishes: number; totalMinutes: number }>();
  const currentOrders = await db.from("table_orders").select("table_number,items_json");
  if (currentOrders.error) throw currentOrders.error;
  const openTables = (currentOrders.data ?? []).filter((row) => Array.isArray(row.items_json) && row.items_json.length).length;
  let totalMinutes = 0; let closed = 0;
  for (const session of closedSessions) { const key = String(session.opened_by); const current = byWaiter.get(key) ?? { name: session.users?.name ?? session.users?.username ?? "Usuario", area: session.area ?? "salao", tables: 0, dishes: dishesByWaiter.get(key) ?? 0, totalMinutes: 0 }; current.tables += 1; const minutes = Math.max(0, (new Date(session.released_at).getTime() - new Date(session.opened_at).getTime()) / 60000); current.totalMinutes += minutes; totalMinutes += minutes; closed += 1; byWaiter.set(key, current); }
  const waiterRows = [...byWaiter.values()].map((row) => ({ name: row.name, area: row.area, tables: row.tables, dishes: row.dishes, averageMinutes: row.tables ? Math.round(row.totalMinutes / row.tables) : 0 })).sort((a, b) => b.dishes - a.dishes);
  const dishRows = [...byDish.values()].map((row) => ({ name: row.name, quantity: row.quantity, orders: row.orders, tables: row.tables.size })).sort((a, b) => b.quantity - a.quantity || b.orders - a.orders || a.name.localeCompare(b.name));
  return { totalTables: closed, openTables, closedTables: closed, totalDishes: waiterRows.reduce((total, row) => total + row.dishes, 0), uniqueDishes: dishRows.length, dishOrders: dishRows.reduce((total, row) => total + row.orders, 0), averageMinutes: closed ? Math.round(totalMinutes / closed) : 0, byWaiter: waiterRows, byDish: dishRows };
}
