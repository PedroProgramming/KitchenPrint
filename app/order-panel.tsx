"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

type Item = {
  id: string;
  name: string;
  kind: "Prato" | "Bebida";
  quantity: number;
  note: string;
  printedQuantity?: number;
};
type Orders = Record<number, Item[]>;
type MenuItem = { id: string; name: string; price: number; kind: "Prato" | "Bebida"; active: boolean };
type Props = {
  table: number;
  menu: MenuItem[];
  orders: Orders;
  setOrders: Dispatch<SetStateAction<Orders>>;
  available: boolean;
  canRelease: boolean;
  onRelease: () => void;
  onPrint: () => void;
  printing: boolean;
};
const field =
  "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100";

export default function OrderPanel({
  table,
  menu,
  orders,
  setOrders,
  available,
  canRelease,
  onRelease,
  onPrint,
  printing,
}: Props) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Item["kind"]>("Prato");
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [removeItem, setRemoveItem] = useState<Item | null>(null);
  const items = orders[table] ?? [];
  const kitchen = items.filter((item) => item.kind === "Prato" && (item.printedQuantity ?? 0) < item.quantity);
  const availableMenu = useMemo(() => menu.filter((item) => item.kind === kind), [kind, menu]);
  useEffect(() => {
    if (!availableMenu.some((item) => item.id === selectedMenuId)) setSelectedMenuId(availableMenu[0]?.id ?? "");
  }, [availableMenu, selectedMenuId]);
  function add() {
    const selectedMenuItem = availableMenu.find((entry) => entry.id === selectedMenuId);
    if (!selectedMenuItem) return;
    const item: Item = {
      id: crypto.randomUUID(),
      name: selectedMenuItem.name,
      kind: selectedMenuItem.kind,
      quantity: Math.max(1, quantity),
      note: note.trim(),
    };
    setOrders((current) => {
      const existing = current[table] ?? [];
      const match = existing.find(
        (entry) =>
          entry.name.toLowerCase() === item.name.toLowerCase() &&
          entry.kind === item.kind &&
          entry.note === item.note,
      );
      return {
        ...current,
        [table]: match
          ? existing.map((entry) =>
              entry.id === match.id
                ? { ...entry, quantity: entry.quantity + item.quantity }
                : entry,
            )
          : [...existing, item],
      };
    });
    setQuantity(1);
    setNote("");
    setOpen(false);
  }
  function change(id: string, amount: number) {
    setOrders((current) => ({
      ...current,
      [table]: (current[table] ?? []).map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + amount) }
          : item,
      ),
    }));
  }
  function confirmRemove() {
    if (!removeItem) return;
    setOrders((current) => ({
      ...current,
      [table]: (current[table] ?? []).filter((entry) => entry.id !== removeItem.id),
    }));
    setRemoveItem(null);
  }
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-500">
            Mesa {table}
          </p>
          <h2 className="text-xl font-black">Itens do pedido</h2>
        </div>
        {canRelease && (
          <button
            className="text-xs font-black text-orange-500 disabled:opacity-40"
            onClick={onRelease}
            disabled={!items.length}
          >
            Liberar mesa
          </button>
        )}
      </div>
      {open ? (
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <strong className="text-sm">Novo item</strong>
            <button
              className="text-xs font-bold text-slate-500"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
          </div>
          <div className="grid grid-cols-[1fr_86px] gap-2">
            <label className="text-xs font-bold text-slate-500">
              Tipo
              <select
                className={field}
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as Item["kind"])
                }
              >
                <option>Prato</option>
                <option>Bebida</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500">
              Qtd.
              <input
                className={field}
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
            </label>
          </div>
          <label className="mt-2 block text-xs font-bold text-slate-500">
            Nome do Prato ou Bebida
            <select autoFocus className={field} value={selectedMenuId} onChange={(event) => setSelectedMenuId(event.target.value)}>
              {availableMenu.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.price ? ` - R$ ${item.price.toFixed(2).replace(".", ",")}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block text-xs font-bold text-slate-500">
            Observação
            <textarea
              className={`${field} min-h-16 resize-none`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Sem gelo, sem cebola..."
            />
          </label>
          <button
            className="mt-1 w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-black text-white disabled:opacity-40"
            onClick={add}
            disabled={!available || !selectedMenuId}
          >
            Adicionar item
          </button>
        </div>
      ) : (
        <button
          className="mb-3 flex w-full items-center justify-center rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 px-3 py-3 text-sm font-black text-orange-600 hover:border-orange-400 hover:bg-orange-100"
          onClick={() => setOpen(true)}
          disabled={!available}
        >
          + Novo item
        </button>
      )}
      <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 pr-1 sm:max-h-[360px]">
        {!items.length ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Nenhum item adicionado.
          </p>
        ) : (
          items.map((item) => (
            <div
              className="flex min-w-0 items-center justify-between gap-2 py-3"
              key={item.id}
            >
              <div className="min-w-0">
                <strong className="block truncate text-sm sm:text-base">
                  {item.quantity}x {item.name}
                </strong>
                <small className="block text-xs text-slate-500">
                  {item.kind}
                  {(item.printedQuantity ?? 0) >= item.quantity && <span className="ml-1 font-black text-emerald-600">✓ Impresso</span>}
                  {(item.printedQuantity ?? 0) < item.quantity && <span className="ml-1 font-black text-orange-600">· {item.quantity - (item.printedQuantity ?? 0)} pendente(s)</span>}
                  {item.note && (
                    <em className="ml-1 rounded bg-orange-100 px-1.5 py-0.5 not-italic text-orange-700">
                      {item.note}
                    </em>
                  )}
                </small>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  className="h-7 w-7 rounded-lg border border-slate-200 bg-white font-black"
                  onClick={() => change(item.id, -1)}
                >
                  −
                </button>
                <b className="w-5 text-center text-sm">{item.quantity}</b>
                <button
                  className="h-7 w-7 rounded-lg border border-slate-200 bg-white font-black"
                  onClick={() => change(item.id, 1)}
                >
                  +
                </button>
                <button
                  className="ml-1 h-7 w-7 rounded-lg bg-red-50 text-lg text-red-600"
                  onClick={() => setRemoveItem(item)}
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <button
        className="mt-4 w-full rounded-xl bg-orange-500 px-3 py-3.5 font-black text-white disabled:opacity-40"
        onClick={onPrint}
        disabled={!kitchen.length || printing}
      >
        {printing ? "Enviando..." : "Imprimir pratos para cozinha"}
      </button>
      {removeItem && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-widest text-red-500">
              Confirmar remoção
            </p>
            <h3 className="mt-1 text-2xl font-black">Remover item?</h3>
            <p className="mt-3 text-sm text-slate-500">
              Deseja remover <strong>{removeItem.quantity}x {removeItem.name}</strong> da Mesa {table}?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100" onClick={() => setRemoveItem(null)}>
                Cancelar
              </button>
              <button className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700" onClick={confirmRemove}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
