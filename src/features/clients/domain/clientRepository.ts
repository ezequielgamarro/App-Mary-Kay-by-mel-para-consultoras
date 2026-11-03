import type { RepoResult } from '@/core/data/repoResult';

import type { Client, ClientInput } from './client';

export type { RepoResult };

/** Contrato de acceso a datos de clientas: la UI y los hooks solo conocen esta interfaz. */
export interface ClientRepository {
  list(): Promise<RepoResult<Client[]>>;
  get(id: string): Promise<RepoResult<Client | null>>;
  create(input: ClientInput): Promise<RepoResult<Client>>;
  update(id: string, input: ClientInput): Promise<RepoResult<Client>>;
  remove(id: string): Promise<RepoResult<null>>;
}
