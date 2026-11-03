import type { RepoResult } from '@/core/data/repoResult';
import { supabase } from '@/core/supabase/client';

import type { TaskRepository } from '../domain/taskRepository';
import { TASK_COLUMNS, toTask, toWritableRow, type TaskRow } from './taskMapper';

const GENERIC_ERROR = 'No pudimos completar la acción. Revisá tu conexión y probá de nuevo.';

function fail<T>(error: object): RepoResult<T> {
  // El detalle técnico va solo al log; la usuaria ve un mensaje claro.
  console.warn('[agenda] error de Supabase', error);
  return { ok: false, message: GENERIC_ERROR };
}

export const supabaseTaskRepository: TaskRepository = {
  async listPending() {
    const { data, error } = await supabase
      .from('tasks')
      .select(TASK_COLUMNS)
      .eq('hecha', false)
      .order('fecha', { ascending: true })
      .returns<TaskRow[]>();
    if (error) return fail(error);
    return { ok: true, data: data.map(toTask) };
  },

  async create(input) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(toWritableRow(input))
      .select(TASK_COLUMNS)
      .single<TaskRow>();
    if (error) return fail(error);
    return { ok: true, data: toTask(data) };
  },

  async setDone(id, hecha) {
    const { error } = await supabase.from('tasks').update({ hecha }).eq('id', id);
    if (error) return fail(error);
    return { ok: true, data: null };
  },

  async remove(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) return fail(error);
    return { ok: true, data: null };
  },
};
