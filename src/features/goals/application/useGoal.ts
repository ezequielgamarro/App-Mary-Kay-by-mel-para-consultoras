import { useCallback } from 'react';

import { useLoad } from '@/core/data/useLoad';

import { supabaseGoalRepository } from '../data/supabaseGoalRepository';
import { buildGoalInput, type Goal, type GoalForm } from '../domain/goal';
import type { GoalRepository } from '../domain/goalRepository';

export function useGoal(mes: string, repository: GoalRepository = supabaseGoalRepository) {
  const load = useCallback(() => repository.get(mes), [mes, repository]);
  return useLoad<Goal | null>(load);
}

export type SaveGoalResult =
  { ok: true; goal: Goal } | { ok: false; message: string; field?: keyof GoalForm };

/** Casos de uso de escritura: validan el formulario y delegan en el repositorio. */
export function useGoalActions(repository: GoalRepository = supabaseGoalRepository) {
  const save = useCallback(
    async (mes: string, form: GoalForm): Promise<SaveGoalResult> => {
      const built = buildGoalInput(form);
      if (!built.ok) return { ok: false, message: built.message, field: built.field };
      const result = await repository.save(mes, built.input);
      return result.ok ? { ok: true, goal: result.data } : { ok: false, message: result.message };
    },
    [repository],
  );

  const remove = useCallback((mes: string) => repository.remove(mes), [repository]);

  return { save, remove };
}
