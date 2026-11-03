import type { RepoResult } from '@/core/data/repoResult';

import type { Goal, GoalInput } from './goal';

export type { RepoResult };

/** Contrato de acceso a datos de metas: la UI y los hooks solo conocen esta interfaz. */
export interface GoalRepository {
  /** Meta del mes (primer día, AAAA-MM-01), o null si todavía no la definió. */
  get(mes: string): Promise<RepoResult<Goal | null>>;
  /** Crea la meta del mes o la reemplaza si ya existía. */
  save(mes: string, input: GoalInput): Promise<RepoResult<Goal>>;
  remove(mes: string): Promise<RepoResult<null>>;
}
