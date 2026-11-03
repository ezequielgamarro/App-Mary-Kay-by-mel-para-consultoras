import type { RepoResult } from '@/core/data/repoResult';

import type { Task, TaskInput } from './task';

export type { RepoResult };

/** Contrato de acceso a datos de tareas: la UI y los hooks solo conocen esta interfaz. */
export interface TaskRepository {
  /** Tareas pendientes (las hechas no se listan). */
  listPending(): Promise<RepoResult<Task[]>>;
  create(input: TaskInput): Promise<RepoResult<Task>>;
  setDone(id: string, hecha: boolean): Promise<RepoResult<null>>;
  remove(id: string): Promise<RepoResult<null>>;
}
