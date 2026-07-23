export type KitchenItem = { name: string; kind: "Prato" | "Bebida"; quantity: number; note?: string };

const encoder = new TextEncoder();
const clean = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E\n]/g, "");
const bytes = (...values: number[]) => new Uint8Array(values);

function text(value: string) { return encoder.encode(clean(value)); }
function join(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

export function buildKitchenTicket(table: number, items: KitchenItem[]) {
  const divider = "--------------------------------\n";
  const printedAt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const output: Uint8Array[] = [
    bytes(0x1b, 0x40), bytes(0x1b, 0x61, 0x01), bytes(0x1b, 0x45, 0x01), bytes(0x1d, 0x21, 0x10),
    text("COZINHA\n"), bytes(0x1d, 0x21, 0x00), bytes(0x1b, 0x61, 0x00),
    bytes(0x1d, 0x21, 0x00), text(`MESA ${table}\n${divider}`), bytes(0x1d, 0x21, 0x00)
  ];
  for (const item of items) {
    output.push(bytes(0x1b, 0x45, 0x01), bytes(0x1d, 0x21, 0x10), text(`${item.quantity}x  ${item.name.toUpperCase()}\n`), bytes(0x1d, 0x21, 0x00));
    if (item.note) output.push(bytes(0x1b, 0x45, 0x01), bytes(0x1d, 0x21, 0x10), text(`Observacao: ${item.note}\n`), bytes(0x1d, 0x21, 0x00), bytes(0x1b, 0x45, 0x00));
    output.push(text(`${divider}\n`));
  }
  output.push(bytes(0x1b, 0x45, 0x01), bytes(0x1d, 0x21, 0x00), text(`HORARIO: ${printedAt}\n`), bytes(0x1d, 0x21, 0x00), bytes(0x1b, 0x45, 0x00), bytes(0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a), bytes(0x1d, 0x56, 0x00));
  return join(output);
}
