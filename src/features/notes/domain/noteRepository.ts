import type { RepoResult } from '@/core/data/repoResult';

import type { Note, NoteInput } from './note';

export type { RepoResult };

/** Contrato de acceso a datos de notas: la UI y los hooks solo conocen esta interfaz. */
export interface NoteRepository {
  /** Notas de la más recientemente modificada a la más antigua (hasta 500). */
  list(): Promise<RepoResult<Note[]>>;
  get(id: string): Promise<RepoResult<Note | null>>;
  create(input: NoteInput): Promise<RepoResult<Note>>;
  update(id: string, input: NoteInput): Promise<RepoResult<Note>>;
  remove(id: string): Promise<RepoResult<null>>;
}
