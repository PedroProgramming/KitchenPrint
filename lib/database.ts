import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export type Role = "admin" | "garcom"; export type Area = "salao" | "copa";
export type ShoppingTarget = "cozinha" | "salao" | "copa";
export type ShoppingPriority = "normal" | "urgente";
export type ShoppingStatus = "pendente" | "comprado" | "cancelado";
export type RestaurantTable = { id: string; number: number; name: string; area: Area; active: boolean };
export type StoredItem = { id: string; name: string; kind: "Prato" | "Bebida"; quantity: number; note: string; printedQuantity?: number; logType?: "addition" | "confirmation" };
export type MenuItem = { id: string; name: string; price: number; kind: "Prato" | "Bebida"; active: boolean };
export type User = { id: string; name: string; username: string; role: Role; area: Area | null; tables: number[] };
export type ShoppingListItem = {
  id: string;
  target: ShoppingTarget;
  name: string;
  quantity: number;
  unit: string;
  priority: ShoppingPriority;
  note: string;
  status: ShoppingStatus;
  requestedBy: string;
  requestedByUsername: string;
  resolvedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
};
export type FinanceEntryType = "receita" | "despesa";
export type FinancePaymentMethod = "dinheiro" | "pix" | "cartao" | "boleto" | "outro";
export type FinanceStatus = "pago" | "pendente" | "cancelado";
export type FinanceProofImage = { name: string; dataUrl: string };
export type CashRegister = {
  id: string;
  businessDate: string;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  differenceAmount: number | null;
  openedAt: string;
  closedAt: string | null;
  openedBy: string;
  closedBy: string | null;
  notes: string;
};
export type FinanceEntry = {
  id: string;
  cashRegisterId: string | null;
  entryDate: string;
  type: FinanceEntryType;
  category: string;
  description: string;
  amount: number;
  paymentMethod: FinancePaymentMethod;
  status: FinanceStatus;
  dueDate: string | null;
  paidAt: string | null;
  supplier: string;
  documentNumber: string;
  documentNote: string;
  proofImageName: string;
  proofImageDataUrl: string;
  proofImages: FinanceProofImage[];
  installmentGroupId: string | null;
  installmentNumber: number;
  installmentTotal: number;
  installmentIntervalDays: number;
  originalDueDate: string | null;
  dueDateAdjusted: boolean;
  createdBy: string;
  createdAt: string;
};
export type FinanceCategory = { id: string; name: string };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) console.warn("Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
const SUPABASE_TIMEOUT_MS = 7000;
async function timedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  const abort = () => controller.abort();
  init?.signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (response.status === 522) throw new Error("Supabase demorou para responder.");
    return response;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Supabase demorou para responder.");
    throw error;
  } finally {
    clearTimeout(timeout);
    init?.signal?.removeEventListener("abort", abort);
  }
}
const db = createClient(url ?? "https://invalid.supabase.co", key ?? "invalid", { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: timedFetch } });
let financeEntrySelectPreference: string | null = null;
function mapUser(row: any): User { return { id: row.id, name: row.name, username: row.username, role: row.role, area: row.area ?? null, tables: row.tables_json ?? [] }; }
function mapShoppingListItem(row: any): ShoppingListItem {
  const requester = Array.isArray(row.requester) ? row.requester[0] : row.requester;
  const resolver = Array.isArray(row.resolver) ? row.resolver[0] : row.resolver;
  return {
    id: row.id,
    target: row.target,
    name: row.name,
    quantity: Number(row.quantity),
    unit: row.unit,
    priority: row.priority,
    note: row.note ?? "",
    status: row.status,
    requestedBy: requester?.name ?? requester?.username ?? "Usuario",
    requestedByUsername: requester?.username ?? "",
    resolvedBy: resolver?.name ?? resolver?.username ?? null,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}
function mapCashRegister(row: any): CashRegister {
  const opener = Array.isArray(row.opener) ? row.opener[0] : row.opener;
  const closer = Array.isArray(row.closer) ? row.closer[0] : row.closer;
  const openingAmount = Number(row.opening_amount ?? 0);
  const closingAmount = row.closing_amount === null ? null : Number(row.closing_amount);
  const expectedAmount = row.expected_amount === null ? null : Number(row.expected_amount);
  return {
    id: row.id,
    businessDate: row.business_date,
    openingAmount,
    closingAmount,
    expectedAmount,
    differenceAmount: closingAmount === null || expectedAmount === null ? null : closingAmount - expectedAmount,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    openedBy: opener?.name ?? opener?.username ?? row.opened_by_name ?? "Usuario",
    closedBy: closer?.name ?? closer?.username ?? row.closed_by_name ?? null,
    notes: row.notes ?? "",
  };
}
function mapFinanceEntry(row: any): FinanceEntry {
  const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator;
  const proofImages = Array.isArray(row.proof_images_json) ? row.proof_images_json.filter((proof: any) => proof?.name || proof?.dataUrl) : [];
  if (!proofImages.length && (row.proof_image_name || row.proof_image_data_url)) proofImages.push({ name: row.proof_image_name ?? "", dataUrl: row.proof_image_data_url ?? "" });
  return {
    id: row.id,
    cashRegisterId: row.cash_register_id,
    entryDate: row.entry_date,
    type: row.type,
    category: row.category,
    description: row.description,
    amount: Number(row.amount ?? 0),
    paymentMethod: row.payment_method,
    status: row.status,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    supplier: row.supplier ?? "",
    documentNumber: row.document_number ?? "",
    documentNote: row.document_note ?? "",
    proofImageName: row.proof_image_name ?? "",
    proofImageDataUrl: row.proof_image_data_url ?? "",
    proofImages,
    installmentGroupId: row.installment_group_id ?? null,
    installmentNumber: Number(row.installment_number ?? 1),
    installmentTotal: Number(row.installment_total ?? 1),
    installmentIntervalDays: Number(row.installment_interval_days ?? 0),
    originalDueDate: row.original_due_date ?? row.due_date ?? null,
    dueDateAdjusted: Boolean(row.due_date_adjusted ?? false),
    createdBy: creator?.name ?? creator?.username ?? row.created_by_name ?? "Usuario",
    createdAt: row.created_at,
  };
}
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
        const logged = await db.from("consumption_logs").insert({ session_id: session.id, table_number: number, user_id: user.id, items_json: additions.map((item) => ({ ...item, logType: "addition" })) });
        if (logged.error) throw logged.error;
      }
      if (confirmations.length) {
        const confirmed = await db.from("consumption_logs").insert({ session_id: session.id, table_number: number, user_id: user.id, items_json: confirmations.map((item) => ({ ...item, logType: "confirmation" })) });
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
export async function listShoppingItems() {
  const { data, error } = await db.from("shopping_list_items").select("id,target,name,quantity,unit,priority,note,status,created_at,resolved_at,requester:requested_by(name,username),resolver:resolved_by(name,username)").order("status").order("priority", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapShoppingListItem);
}
export async function createShoppingItem(input: { target: ShoppingTarget; name: string; quantity: number; unit: string; priority: ShoppingPriority; note: string; requestedBy: string }) {
  const { error } = await db.from("shopping_list_items").insert({ target: input.target, name: input.name.trim(), quantity: input.quantity, unit: input.unit.trim(), priority: input.priority, note: input.note.trim(), requested_by: input.requestedBy });
  if (error) throw error;
}
export async function updateShoppingItemStatus(input: { id: string; status: Exclude<ShoppingStatus, "pendente">; resolvedBy: string }) {
  const { error } = await db.from("shopping_list_items").update({ status: input.status, resolved_by: input.resolvedBy, resolved_at: new Date().toISOString() }).eq("id", input.id).eq("status", "pendente");
  if (error) throw error;
}
export async function getFinanceSnapshot(from?: string, to?: string) {
  const entrySelect = "id,cash_register_id,entry_date,type,category,description,amount,payment_method,status,due_date,paid_at,supplier,document_number,document_note,proof_image_name,installment_group_id,installment_number,installment_total,installment_interval_days,original_due_date,due_date_adjusted,created_at";
  const proofEntrySelect = "id,cash_register_id,entry_date,type,category,description,amount,payment_method,status,due_date,paid_at,supplier,document_number,document_note,proof_image_name,installment_group_id,installment_number,installment_total,created_at";
  const legacyEntrySelect = "id,cash_register_id,entry_date,type,category,description,amount,payment_method,status,due_date,paid_at,supplier,document_number,document_note,created_at";
  let cashQuery = db.from("cash_registers").select("id,business_date,opening_amount,closing_amount,expected_amount,opened_by,closed_by,opened_at,closed_at,notes").order("business_date", { ascending: false }).limit(90);
  if (from) cashQuery = cashQuery.gte("business_date", from);
  if (to) cashQuery = cashQuery.lte("business_date", to);
  async function readEntries(select: string) {
    let entriesQuery = db.from("finance_entries").select(select).order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(800);
    if (from) entriesQuery = entriesQuery.gte("entry_date", from);
    if (to) entriesQuery = entriesQuery.lte("entry_date", to);
    return entriesQuery;
  }

  async function readCompatibleEntries() {
    const selects = [financeEntrySelectPreference, entrySelect, proofEntrySelect, legacyEntrySelect].filter((select, index, list): select is string => Boolean(select) && list.indexOf(select) === index);
    for (const select of selects) {
      const result = await readEntries(select);
      if (!result.error) {
        financeEntrySelectPreference = select;
        return result;
      }
    }
    return readEntries(legacyEntrySelect);
  }

  const [cashResult, entryResult, categories] = await Promise.all([cashQuery, readCompatibleEntries(), listFinanceCategories()]);
  if (cashResult.error) throw cashResult.error;
  if (entryResult.error) throw entryResult.error;

  const cashRegisters = (cashResult.data ?? []).map(mapCashRegister);
  const entries = (entryResult.data ?? []).map(mapFinanceEntry);
  const paidEntries = entries.filter((entry) => entry.status === "pago");
  const revenue = paidEntries.filter((entry) => entry.type === "receita").reduce((total, entry) => total + entry.amount, 0);
  const expenses = paidEntries.filter((entry) => entry.type === "despesa").reduce((total, entry) => total + entry.amount, 0);
  const cashRevenue = paidEntries.filter((entry) => entry.type === "receita" && entry.paymentMethod === "dinheiro").reduce((total, entry) => total + entry.amount, 0);
  const cashExpenses = paidEntries.filter((entry) => entry.type === "despesa" && entry.paymentMethod === "dinheiro").reduce((total, entry) => total + entry.amount, 0);
  const pendingPayables = entries.filter((entry) => entry.type === "despesa" && entry.status === "pendente").sort((a, b) => String(a.dueDate ?? a.entryDate).localeCompare(String(b.dueDate ?? b.entryDate)));
  const today = new Date().toISOString().slice(0, 10);
  const openCash = cashRegisters.find((cash) => !cash.closedAt) ?? null;

  return {
    cashRegisters,
    entries,
    openCash,
    totals: {
      revenue,
      expenses,
      cashRevenue,
      cashExpenses,
      balance: revenue - expenses,
      pendingPayables: pendingPayables.reduce((total, entry) => total + entry.amount, 0),
      overduePayables: pendingPayables.filter((entry) => (entry.dueDate ?? entry.entryDate) < today).reduce((total, entry) => total + entry.amount, 0),
    },
    pendingPayables,
    categories,
  };
}
export async function listFinanceCategories() {
  const { data, error } = await db.from("finance_categories").select("id,name").order("name");
  if (error) return [];
  return (data ?? []) as FinanceCategory[];
}
export async function createFinanceCategory(name: string) {
  const clean = name.trim();
  if (!clean) throw new Error("Categoria invalida");
  const { error } = await db.from("finance_categories").upsert({ name: clean }, { onConflict: "name", ignoreDuplicates: true });
  if (error && !String(error.message).includes("finance_categories")) throw error;
}
export async function getFinanceEntryProof(id: string) {
  const { data, error } = await db.from("finance_entries").select("id,proof_image_name,proof_image_data_url,proof_images_json").eq("id", id).maybeSingle();
  if (error) throw error;
  const proofImages = Array.isArray(data?.proof_images_json) ? data.proof_images_json.filter((proof: any) => proof?.name || proof?.dataUrl) : [];
  if (!proofImages.length && (data?.proof_image_name || data?.proof_image_data_url)) proofImages.push({ name: data.proof_image_name ?? "", dataUrl: data.proof_image_data_url ?? "" });
  return {
    id: data?.id ?? id,
    proofImageName: data?.proof_image_name ?? "",
    proofImageDataUrl: data?.proof_image_data_url ?? "",
    proofImages,
  };
}
export async function openCashRegister(input: { businessDate: string; openingAmount: number; openedBy: string; notes?: string }) {
  const { error } = await db.from("cash_registers").insert({ business_date: input.businessDate, opening_amount: input.openingAmount, opened_by: input.openedBy, notes: input.notes?.trim() ?? "" });
  if (error) throw error;
}
export async function closeCashRegister(input: { id: string; closingAmount: number; closedBy: string; notes?: string }) {
  const current = await db.from("cash_registers").select("id,business_date,opening_amount").eq("id", input.id).is("closed_at", null).maybeSingle();
  if (current.error) throw current.error;
  if (!current.data) throw new Error("Caixa nao encontrado");
  const totals = await getFinanceSnapshot(current.data.business_date, current.data.business_date);
  const expectedAmount = Number(current.data.opening_amount ?? 0) + totals.totals.cashRevenue - totals.totals.cashExpenses;
  const { error } = await db.from("cash_registers").update({ closing_amount: input.closingAmount, expected_amount: expectedAmount, closed_by: input.closedBy, closed_at: new Date().toISOString(), notes: input.notes?.trim() ?? "" }).eq("id", input.id).is("closed_at", null);
  if (error) throw error;
}
export async function createFinanceEntry(input: { cashRegisterId?: string | null; entryDate: string; type: FinanceEntryType; category: string; description: string; amount: number; paymentMethod: FinancePaymentMethod; status: FinanceStatus; dueDate?: string | null; originalDueDate?: string | null; dueDateAdjusted?: boolean; supplier?: string; documentNumber?: string; documentNote?: string; proofImageName?: string; proofImageDataUrl?: string; proofImages?: FinanceProofImage[]; installmentGroupId?: string | null; installmentNumber?: number; installmentTotal?: number; installmentIntervalDays?: number; createdBy: string }) {
  const proofImages = Array.isArray(input.proofImages) ? input.proofImages.filter((proof) => proof.name?.trim() || proof.dataUrl?.trim()).slice(0, 8) : [];
  const firstProof = proofImages[0];
  const { error } = await db.from("finance_entries").insert({
    cash_register_id: input.cashRegisterId ?? null,
    entry_date: input.entryDate,
    type: input.type,
    category: input.category.trim(),
    description: input.description.trim(),
    amount: input.amount,
    payment_method: input.paymentMethod,
    status: input.status,
    due_date: input.dueDate || null,
    original_due_date: input.originalDueDate || input.dueDate || null,
    due_date_adjusted: input.dueDateAdjusted ?? false,
    paid_at: input.status === "pago" ? new Date().toISOString() : null,
    supplier: input.supplier?.trim() ?? "",
    document_number: input.documentNumber?.trim() ?? "",
    document_note: input.documentNote?.trim() ?? "",
    proof_image_name: firstProof?.name?.trim() ?? input.proofImageName?.trim() ?? "",
    proof_image_data_url: firstProof?.dataUrl ?? input.proofImageDataUrl ?? "",
    proof_images_json: proofImages,
    installment_group_id: input.installmentGroupId ?? null,
    installment_number: input.installmentNumber ?? 1,
    installment_total: input.installmentTotal ?? 1,
    installment_interval_days: input.installmentIntervalDays ?? 0,
    created_by: input.createdBy,
  });
  if (error) throw error;
}
export async function updateFinanceEntry(input: { id: string; entryDate: string; type: FinanceEntryType; category: string; description: string; amount: number; paymentMethod: FinancePaymentMethod; status: FinanceStatus; dueDate?: string | null; originalDueDate?: string | null; dueDateAdjusted?: boolean; supplier?: string; documentNumber?: string; documentNote?: string }) {
  const values = {
    entry_date: input.entryDate,
    type: input.type,
    category: input.category.trim(),
    description: input.description.trim(),
    amount: input.amount,
    payment_method: input.paymentMethod,
    status: input.status,
    due_date: input.dueDate || null,
    original_due_date: input.originalDueDate || input.dueDate || null,
    due_date_adjusted: input.dueDateAdjusted ?? false,
    paid_at: input.status === "pago" ? new Date().toISOString() : null,
    supplier: input.supplier?.trim() ?? "",
    document_number: input.documentNumber?.trim() ?? "",
    document_note: input.documentNote?.trim() ?? "",
  };
  const { error } = await db.from("finance_entries").update(values).eq("id", input.id);
  if (error) throw error;
}
export async function updateFinanceEntryStatus(input: { id: string; status: FinanceStatus }) {
  const current = await db.from("finance_entries").select("status").eq("id", input.id).maybeSingle();
  if (current.error) throw current.error;
  if (!current.data) throw new Error("Lancamento nao encontrado");
  if (current.data.status === "pago" && input.status !== "pago") throw new Error("Lancamento pago nao pode voltar de status");
  const values = { status: input.status, paid_at: input.status === "pago" ? new Date().toISOString() : null };
  const { error } = await db.from("finance_entries").update(values).eq("id", input.id);
  if (error) throw error;
}
export async function deleteFinanceEntry(id: string) {
  const { error } = await db.from("finance_entries").delete().eq("id", id);
  if (error) throw error;
}
export async function getPrintJobStatus(id: string) { const { data, error } = await db.from("print_jobs").select("status,error_message").eq("id", id).maybeSingle(); if (error) throw error; return data; }
export async function dashboardStats() { const { data, error } = await db.from("service_sessions").select("id,table_number,area,opened_at,released_at,opened_by,users!service_sessions_opened_by_fkey(name,username)").order("opened_at", { ascending: false }); if (error) throw error; const sessions = (data ?? []) as any[]; const byWaiter = new Map<string, { name: string; area: string; tables: number; totalMinutes: number }>(); let totalMinutes = 0; let closed = 0; for (const session of sessions) { const key = String(session.opened_by); const name = session.users?.name ?? session.users?.username ?? "Usuário"; const current = byWaiter.get(key) ?? { name, area: session.area ?? "salao", tables: 0, totalMinutes: 0 }; current.tables += 1; if (session.released_at) { const minutes = Math.max(0, (new Date(session.released_at).getTime() - new Date(session.opened_at).getTime()) / 60000); current.totalMinutes += minutes; totalMinutes += minutes; closed += 1; } byWaiter.set(key, current); } return { totalTables: sessions.length, openTables: sessions.length - closed, closedTables: closed, averageMinutes: closed ? Math.round(totalMinutes / closed) : 0, byWaiter: [...byWaiter.values()].map((row) => ({ ...row, averageMinutes: row.tables ? Math.round(row.totalMinutes / row.tables) : 0 })).sort((a, b) => b.tables - a.tables), recent: sessions.slice(0, 20) }; }
export async function dashboardStatsForDate(date?: string) {
  return dashboardStatsForRange(date, date);
}

function utcIsoFromSaoPauloDate(date: string, edge: "start" | "end") {
  const [year, month, day] = date.split("-").map(Number);
  const hour = edge === "start" ? 0 : 23;
  const minute = edge === "start" ? 1 : 59;
  const second = edge === "start" ? 0 : 59;
  const millisecond = edge === "start" ? 0 : 999;
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, second, millisecond)).toISOString();
}

export async function dashboardStatsForRange(from?: string, to?: string) {
  const start = from ? utcIsoFromSaoPauloDate(from, "start") : undefined;
  const end = to ? utcIsoFromSaoPauloDate(to, "end") : undefined;
  let sessionsQuery = db.from("service_sessions").select("id,table_number,area,opened_at,released_at,opened_by,users!service_sessions_opened_by_fkey(name,username)").order("opened_at", { ascending: false });
  if (start) sessionsQuery = sessionsQuery.gte("released_at", start);
  if (end) sessionsQuery = sessionsQuery.lte("released_at", end);
  const { data, error } = await sessionsQuery;
  if (error) throw error;
  const closedSessions = ((data ?? []) as any[]).filter((session) => session.released_at);
  const byDish = new Map<string, { name: string; quantity: number; orders: number; tables: Set<number> }>();
  const byWaiter = new Map<string, { name: string; area: string; tables: Set<number>; dishes: number; totalMinutes: number; closedTables: number }>();

  function waiterRow(key: string, input: { name?: string; username?: string; area?: string }) {
    const current = byWaiter.get(key) ?? { name: input.name ?? input.username ?? "Usuario", area: input.area ?? "salao", tables: new Set<number>(), dishes: 0, totalMinutes: 0, closedTables: 0 };
    if (input.name || input.username) current.name = input.name ?? input.username ?? current.name;
    if (input.area) current.area = input.area;
    byWaiter.set(key, current);
    return current;
  }

  function relatedUser(value: any) {
    return Array.isArray(value) ? value[0] : value;
  }

  function addDishStats(items: StoredItem[], tableNumber: number, waiterId?: string) {
    for (const item of items.filter((entry) => entry.kind === "Prato")) {
      const key = item.name.trim().toLowerCase();
      const current = byDish.get(key) ?? { name: item.name, quantity: 0, orders: 0, tables: new Set<number>() };
      const quantity = Number(item.quantity || 0);
      current.quantity += quantity;
      current.orders += 1;
      current.tables.add(Number(tableNumber));
      byDish.set(key, current);
      if (waiterId) {
        const waiter = byWaiter.get(waiterId);
        if (waiter) waiter.dishes += quantity;
      }
    }
  }

  let logsQuery = db.from("consumption_logs").select("session_id,table_number,user_id,items_json,created_at,users!consumption_logs_user_id_fkey(name,username,area)").order("created_at", { ascending: true });
  if (start) logsQuery = logsQuery.gte("created_at", start);
  if (end) logsQuery = logsQuery.lte("created_at", end);
  const { data: logs, error: logsError } = await logsQuery;
  if (logsError) throw logsError;
  const logsBySession = new Map<string, any[]>();
  for (const log of logs ?? []) {
    logsBySession.set(log.session_id, [...(logsBySession.get(log.session_id) ?? []), log]);
    const user = relatedUser(log.users);
    const waiter = waiterRow(String(log.user_id), { name: user?.name, username: user?.username, area: user?.area });
    waiter.tables.add(Number(log.table_number));
  }

  for (const sessionLogs of logsBySession.values()) {
    const taggedAdditions = sessionLogs.flatMap((log) => ((log.items_json ?? []) as StoredItem[]).filter((item) => item.kind === "Prato" && item.logType === "addition").map((item) => ({ item, log })));
    const legacyAdditions = sessionLogs.flatMap((log) => ((log.items_json ?? []) as StoredItem[]).filter((item) => item.kind === "Prato" && item.logType !== "confirmation" && Number(item.printedQuantity ?? 0) < Number(item.quantity || 0)).map((item) => ({ item, log })));
    const source = taggedAdditions.length || legacyAdditions.length ? [...taggedAdditions, ...legacyAdditions] : sessionLogs.flatMap((log) => ((log.items_json ?? []) as StoredItem[]).filter((item) => item.kind === "Prato" && item.logType !== "confirmation").map((item) => ({ item, log })));
    for (const { item, log } of source) addDishStats([item], Number(log.table_number), String(log.user_id));
  }

  let totalMinutes = 0;
  for (const session of closedSessions) {
    const key = String(session.opened_by);
    const waiter = waiterRow(key, { name: session.users?.name, username: session.users?.username, area: session.area });
    waiter.tables.add(Number(session.table_number));
    if (session.released_at) {
      const minutes = Math.max(0, (new Date(session.released_at).getTime() - new Date(session.opened_at).getTime()) / 60000);
      waiter.totalMinutes += minutes;
      waiter.closedTables += 1;
      totalMinutes += minutes;
    }
  }

  const currentOrders = await db.from("table_orders").select("table_number,items_json");
  if (currentOrders.error) throw currentOrders.error;
  const openTables = (currentOrders.data ?? []).filter((row) => Array.isArray(row.items_json) && row.items_json.length).length;
  const closed = closedSessions.length;
  const waiterRows = [...byWaiter.values()].map((row) => ({ name: row.name, area: row.area, tables: row.tables.size, dishes: row.dishes, averageMinutes: row.closedTables ? Math.round(row.totalMinutes / row.closedTables) : 0 })).sort((a, b) => b.dishes - a.dishes || b.tables - a.tables || a.name.localeCompare(b.name));
  const dishRows = [...byDish.values()].map((row) => ({ name: row.name, quantity: row.quantity, orders: row.orders, tables: row.tables.size })).sort((a, b) => b.quantity - a.quantity || b.orders - a.orders || a.name.localeCompare(b.name));
  return { totalTables: closed, openTables, closedTables: closed, totalDishes: waiterRows.reduce((total, row) => total + row.dishes, 0), uniqueDishes: dishRows.length, dishOrders: dishRows.reduce((total, row) => total + row.orders, 0), averageMinutes: closed ? Math.round(totalMinutes / closed) : 0, byWaiter: waiterRows, byDish: dishRows };
}
