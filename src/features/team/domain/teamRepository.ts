import type { RepoResult } from '@/core/data/repoResult';

import type { MyTeam, TeamMember } from './team';

export type { RepoResult };

/** Contrato de acceso a datos de equipo: la UI y los hooks solo conocen esta interfaz. */
export interface TeamRepository {
  myTeam(): Promise<RepoResult<MyTeam>>;
  /** Integrantes directas de mi equipo (vacío si no soy directora de nadie). */
  members(): Promise<RepoResult<TeamMember[]>>;
  /** Unirme al equipo de la directora dueña del código; al unirme acepto compartir. */
  join(codigo: string): Promise<RepoResult<null>>;
  leave(): Promise<RepoResult<null>>;
  setSharing(comparte: boolean): Promise<RepoResult<null>>;
  removeMember(memberId: string): Promise<RepoResult<null>>;
}
