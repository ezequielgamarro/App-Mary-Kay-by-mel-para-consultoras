import type { RepoResult } from '@/core/data/repoResult';
import { supabase } from '@/core/supabase/client';

import type { GoalRepository } from '../domain/goalRepository';
import { GOAL_COLUMNS, toGoal, toWritableRow, type GoalRow } from './goalMapper';

const GENERIC_ERROR = 'No pudimos completar la acción. Revisá tu conexión y probá de nuevo.';

function fail<T>(error: object): RepoResult<T> {
  // El detalle técnico va solo al log; la usuaria ve un mensaje claro.
  console.warn('[goals] error de Supabase', error);
  return { ok: false, message: GENERIC_ERROR };
}

export const supabaseGoalRepository: GoalRepository = {
  async get(mes) {
    const { data, error } = await supabase
      .from('goals')
      .select(GOAL_COLUMNS)
      .eq('mes', mes)
      .maybeSingle<GoalRow>();
    if (error) return fail(error);
    return { ok: true, data: data ? toGoal(data) : null };
  },

  async save(mes, input) {
    // No se usa upsert: `mes` no es actualizable (la base lo impide), así que primero se intenta
    // actualizar la meta del mes y, si no existe, se crea. `user_id` lo completa la base.
    const row = toWritableRow(mes, input);
    const updated = await supabase
      .from('goals')
      .update({ ventas_centavos: row.ventas_centavos, ganancia_centavos: row.ganancia_centavos })
      .eq('mes', mes)
      .select(GOAL_COLUMNS)
      .maybeSingle<GoalRow>();
    if (updated.error) return fail(updated.error);
    if (updated.data) return { ok: true, data: toGoal(updated.data) };

    const created = await supabase.from('goals').insert(row).select(GOAL_COLUMNS).single<GoalRow>();
    if (created.error) return fail(created.error);
    return { ok: true, data: toGoal(created.data) };
  },

  async remove(mes) {
    const { error } = await supabase.from('goals').delete().eq('mes', mes);
    if (error) return fail(error);
    return { ok: true, data: null };
  },
};
