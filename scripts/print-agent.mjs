import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const env = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([^#=]+)=(.*)\s*$/);
  if (match) env[match[1].trim()] = match[2].trim();
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const printer = env.PRINTER_NAME || "POS-80";
if (!url || !key)
  throw new Error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env",
  );
const api = `${url}/rest/v1/print_jobs`;
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path = "", options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });
  if (!response.ok)
    throw new Error(`${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}
async function claim() {
  const jobs = await request("?status=eq.pending&order=created_at.asc&limit=1");
  const job = jobs?.[0];
  if (!job) return null;
  const claimed = await request(`?id=eq.${job.id}&status=eq.pending`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      status: "processing",
      attempts: Number(job.attempts ?? 0) + 1,
    }),
  });
  return claimed?.[0] ? claimed[0] : null;
}
async function processJob(job) {
  try {
    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        join(root, "scripts", "print-raw.ps1"),
        "-Payload",
        job.payload,
        "-Printer",
        printer,
      ],
      { windowsHide: true, timeout: 15000 },
    );
    await request(`?id=eq.${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "printed",
        printed_at: new Date().toISOString(),
        error_message: null,
      }),
    });
    console.log(`Impresso: mesa ${job.table_number}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 1000) : String(error);
    await request(`?id=eq.${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "error", error_message: message }),
    });
    console.error(`Falha na mesa ${job.table_number}: ${message}`);
  }
}
console.log(`Agente de impressao ativo para ${printer}.`);
while (true) {
  try {
    const job = await claim();
    if (job) await processJob(job);
    else await delay(2000);
  } catch (error) {
    console.error(error);
    await delay(5000);
  }
}
