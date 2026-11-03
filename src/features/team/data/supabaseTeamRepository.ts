import type { RepoResult } from '@/core/data/repoResult';
import { supabase } from '@/core/supabase/client';

import type { TeamRepository } from '../domain/teamRepository';
import { teamErrorMessage } from './teamErrors';
import { toMyTeam, toTeamMember, type MyTeamRow, type TeamMemberRow } from './teamMapper';

function fail<T>(error: object): RepoResult<T> {
  // El detalle técnico va solo al log; la usuaria ve un mensaje claro.
  console.warn('[team] error de Supabase', error);
  return { ok: false, message: teamErrorMessage(error) };
}

const NOT_FOUND = 'No encontramos tu perfil. Cerrá sesión y volvé a entrar.';

export const supabaseTeamRepository: TeamRepository = {
  async myTeam() {
    const { data, error } = await supabase.rpc('my_team');
    if (error) return fail(error);
    const row = (data as MyTeamRow[] | null)?.[0];
    return row ? { ok: true, data: toMyTeam(row) } : { ok: false, message: NOT_FOUND };
  },

  async members() {
    const { data, error } = await supabase.rpc('team_summary');
    if (error) return fail(error);
    return { ok: true, data: ((data as TeamMemberRow[] | null) ?? []).map(toTeamMember) };
  },

  async join(codigo) {
    const { error } = await supabase.rpc('join_team', { p_codigo: codigo });
    if (error) return fail(error);
    return { ok: true, data: null };
  },

  async leave() {
    const { error } = await supabase.rpc('leave_team');
    if (error) return fail(error);
    return { ok: true, data: null };
  },

  async setSharing(comparte) {
    const { error } = await supabase.rpc('set_team_sharing', { p_comparte: comparte });
    if (error) return fail(error);
    return { ok: true, data: null };
  },

  async removeMember(memberId) {
    const { error } = await supabase.rpc('remove_team_member', { p_member: memberId });
    if (error) return fail(error);
    return { ok: true, data: null };
  },
};
