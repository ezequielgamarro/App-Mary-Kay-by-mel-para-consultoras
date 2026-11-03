import type { Task, TaskInput } from '../domain/task';

/** Fila tal como la devuelve la tabla `public.tasks`. */
export type TaskRow = { id: string; titulo: string; fecha: string; hecha: boolean };

export const TASK_COLUMNS = 'id, titulo, fecha, hecha';

export function toTask(row: TaskRow): Task {
  return { id: row.id, titulo: row.titulo, fecha: row.fecha, hecha: row.hecha };
}

/** Solo las columnas que la consultora puede escribir (`user_id` lo pone la base). */
export function toWritableRow(input: TaskInput) {
  return { titulo: input.titulo, fecha: input.fecha };
}
