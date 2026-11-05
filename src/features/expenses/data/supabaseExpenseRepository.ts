import type { RepoResult } from '@/core/data/repoResult';
import { supabase } from '@/core/supabase/client';

import type { ExpenseRepository } from '../domain/expenseRepository';
import { EXPENSE_COLUMNS, toExpense, toWritableRow, type ExpenseRow } from './expenseMapper';

const GENERIC_ERROR = 'No pudimos completar la acción. Revisá tu conexión y probá de nuevo.';

function fail<T>(error: object): RepoResult<T> {
  // El detalle técnico va solo al log; la usuaria ve un mensaje claro.
  console.warn('[gastos] error de Supabase', error);
  return { ok: false, message: GENERIC_ERROR };
}

export const supabaseExpenseRepository: ExpenseRepository = {
  async list() {
    const { data, error } = await supabase
      .from('expenses')
      .select(EXPENSE_COLUMNS)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500)
      .returns<ExpenseRow[]>();
    if (error) return fail(error);
    return { ok: true, data: data.map(toExpense) };
  },

  async create(input) {
    const { data, error } = await supabase
      .from('expenses')
      .insert(toWritableRow(input))
      .select(EXPENSE_COLUMNS)
      .single<ExpenseRow>();
    if (error) return fail(error);
    return { ok: true, data: toExpense(data) };
  },

  async remove(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) return fail(error);
    return { ok: true, data: null };
  },
};
