"use client";

import { CashTable, FinanceShell, useFinanceSnapshot } from "../finance-common";

export default function FechamentosPage() {
  const { user, snapshot, error } = useFinanceSnapshot();
  return <FinanceShell user={user} error={error} loading={!snapshot} title="Fechamentos" eyebrow="Historico de caixa" active="fechamentos">
    {snapshot && <CashTable rows={snapshot.cashRegisters} entries={snapshot.entries} />}
  </FinanceShell>;
}
