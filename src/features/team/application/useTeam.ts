import { useCallback } from 'react';

import { useLoad } from '@/core/data/useLoad';

import { supabaseTeamRepository } from '../data/supabaseTeamRepository';
import { normalizeInviteCode, type MyTeam, type TeamMember } from '../domain/team';
import type { TeamRepository } from '../domain/teamRepository';

/** Mi código, mi directora y mi cantidad de integrantes. */
export function useMyTeam(repository: TeamRepository = supabaseTeamRepository) {
  const load = useCallback(() => repository.myTeam(), [repository]);
  return useLoad<MyTeam>(load);
}

/**
 * Resumen de mi equipo. Solo consulta si de verdad tengo integrantes (`enabled`), para no
 * hacer un pedido inútil a quien no es directora.
 */
export function useTeamMembers(
  enabled: boolean,
  repository: TeamRepository = supabaseTeamRepository,
) {
  const load = useCallback(
    () =>
      enabled
        ? repository.members()
        : Promise.resolve({ ok: true as const, data: [] as TeamMember[] }),
    [enabled, repository],
  );
  return useLoad<TeamMember[]>(load);
}

export type ActionResult = { ok: true } | { ok: false; message: string };

function toResult(result: { ok: true } | { ok: false; message: string }): ActionResult {
  return result.ok ? { ok: true } : { ok: false, message: result.message };
}

/** Casos de uso de escritura: validan lo que escribe la usuaria y delegan en el repositorio. */
export function useTeamActions(repository: TeamRepository = supabaseTeamRepository) {
  const join = useCallback(
    async (text: string): Promise<ActionResult> => {
      const codigo = normalizeInviteCode(text);
      if (codigo === null) {
        return {
          ok: false,
          message: 'El código tiene 10 letras y números, por ejemplo 3F9A0C12BE.',
        };
      }
      return toResult(await repository.join(codigo));
    },
    [repository],
  );

  const leave = useCallback(async () => toResult(await repository.leave()), [repository]);
  const setSharing = useCallback(
    async (comparte: boolean) => toResult(await repository.setSharing(comparte)),
    [repository],
  );
  const removeMember = useCallback(
    async (memberId: string) => toResult(await repository.removeMember(memberId)),
    [repository],
  );

  return { join, leave, setSharing, removeMember };
}
