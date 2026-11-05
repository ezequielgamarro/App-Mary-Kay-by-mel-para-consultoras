import { useCallback } from 'react';

import { useLoad } from '@/core/data/useLoad';
import { todayIso } from '@/core/date/dates';

import { supabaseExpenseRepository } from '../data/supabaseExpenseRepository';
import { buildExpenseInput, type Expense, type ExpenseForm } from '../domain/expense';
import type { ExpenseRepository } from '../domain/expenseRepository';

export function useExpenseList(repository: ExpenseRepository = supabaseExpenseRepository) {
  const load = useCallback(() => repository.list(), [repository]);
  return useLoad<Expense[]>(load, 'expenses');
}

export type SaveExpenseResult =
  { ok: true; expense: Expense } | { ok: false; message: string; field?: keyof ExpenseForm };

export type ActionResult = { ok: true } | { ok: false; message: string };

/** Casos de uso de escritura: validan el formulario y delegan en el repositorio. */
export function useExpenseActions(
  repository: ExpenseRepository = supabaseExpenseRepository,
  today: () => string = todayIso,
) {
  const create = useCallback(
    async (form: ExpenseForm): Promise<SaveExpenseResult> => {
      const built = buildExpenseInput(form, today());
      if (!built.ok) return { ok: false, message: built.message, field: built.field };
      const result = await repository.create(built.input);
      return result.ok
        ? { ok: true, expense: result.data }
        : { ok: false, message: result.message };
    },
    [repository, today],
  );

  const remove = useCallback(
    async (id: string): Promise<ActionResult> => {
      const result = await repository.remove(id);
      return result.ok ? { ok: true } : { ok: false, message: result.message };
    },
    [repository],
  );

  return { create, remove };
}
