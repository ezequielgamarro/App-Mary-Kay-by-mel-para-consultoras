import { useCallback } from 'react';

import { useLoad } from '@/core/data/useLoad';
import { todayIso } from '@/core/date/dates';
import { supabaseClientRepository } from '@/features/clients/data/supabaseClientRepository';
import type { ClientRepository } from '@/features/clients/domain/clientRepository';
import { supabaseSaleRepository } from '@/features/sales/data/supabaseSaleRepository';
import type { SaleRepository } from '@/features/sales/domain/saleRepository';

import { supabaseTaskRepository } from '../data/supabaseTaskRepository';
import { buildAgenda, type AgendaItem } from '../domain/agenda';
import { buildTaskInput, type Task, type TaskForm } from '../domain/task';
import type { TaskRepository } from '../domain/taskRepository';

type Repositories = { tasks: TaskRepository; sales: SaleRepository; clients: ClientRepository };

const DEFAULT_REPOSITORIES: Repositories = {
  tasks: supabaseTaskRepository,
  sales: supabaseSaleRepository,
  clients: supabaseClientRepository,
};

/** Agenda de los próximos días: tareas pendientes, cobros por vencer y cumpleaños. */
export function useAgenda(
  repositories: Repositories = DEFAULT_REPOSITORIES,
  today: () => string = todayIso,
) {
  const load = useCallback(async () => {
    const [tasks, sales, clients] = await Promise.all([
      repositories.tasks.listPending(),
      repositories.sales.list(),
      repositories.clients.list(),
    ]);
    if (!tasks.ok) return tasks;
    if (!sales.ok) return sales;
    if (!clients.ok) return clients;
    const now = today();
    const items = buildAgenda({ tasks: tasks.data, sales: sales.data, clients: clients.data }, now);
    return { ok: true as const, data: { items, today: now } };
  }, [repositories, today]);
  return useLoad<{ items: AgendaItem[]; today: string }>(load);
}

export type SaveTaskResult =
  { ok: true; task: Task } | { ok: false; message: string; field?: keyof TaskForm };

export type ActionResult = { ok: true } | { ok: false; message: string };

/** Casos de uso de escritura: validan el formulario y delegan en el repositorio. */
export function useTaskActions(
  repository: TaskRepository = supabaseTaskRepository,
  today: () => string = todayIso,
) {
  const create = useCallback(
    async (form: TaskForm): Promise<SaveTaskResult> => {
      const built = buildTaskInput(form, today());
      if (!built.ok) return { ok: false, message: built.message, field: built.field };
      const result = await repository.create(built.input);
      return result.ok ? { ok: true, task: result.data } : { ok: false, message: result.message };
    },
    [repository, today],
  );

  const complete = useCallback(
    async (id: string): Promise<ActionResult> => {
      const result = await repository.setDone(id, true);
      return result.ok ? { ok: true } : { ok: false, message: result.message };
    },
    [repository],
  );

  const remove = useCallback(
    async (id: string): Promise<ActionResult> => {
      const result = await repository.remove(id);
      return result.ok ? { ok: true } : { ok: false, message: result.message };
    },
    [repository],
  );

  return { create, complete, remove };
}
