import type { RepoResult } from '@/core/data/repoResult';

import type { Expense, ExpenseInput } from './expense';

export type { RepoResult };

/** Contrato de acceso a datos de gastos: la UI y los hooks solo conocen esta interfaz. */
export interface ExpenseRepository {
  /** Gastos del más reciente al más antiguo (hasta 500). */
  list(): Promise<RepoResult<Expense[]>>;
  create(input: ExpenseInput): Promise<RepoResult<Expense>>;
  remove(id: string): Promise<RepoResult<null>>;
}
