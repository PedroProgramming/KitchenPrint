import { createClient } from "@supabase/supabase-js";
import { buildKitchenTicket, type KitchenItem } from "./escpos";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "invalid", { auth: { autoRefreshToken: false, persistSession: false } });

export async function enqueueKitchenOrder(table: number, items: KitchenItem[]) {
  const payload = Buffer.from(buildKitchenTicket(table, items)).toString("base64");
  const { data, error } = await db.from("print_jobs").insert({ table_number: table, payload }).select("id").single();
  if (error) throw error;
  return data.id as string;
}
