import { parseDateAr } from '@/core/date/dates';

export type Task = {
  id: string;
  titulo: string;
  /** Fecha ISO (AAAA-MM-DD). */
  fecha: string;
  hecha: boolean;
};

export type TaskInput = { titulo: string; fecha: string };

/** Lo que escribe la usuaria: título y fecha como texto (DD/MM/AAAA). */
export type TaskForm = { titulo: string; fecha: string };

export const MAX_TASK_TITLE = 200;

export type TaskBuildResult =
  { ok: true; input: TaskInput } | { ok: false; field: keyof TaskForm; message: string };

/** Valida el formulario de una tarea: título obligatorio y fecha real que no sea anterior a hoy. */
export function buildTaskInput(form: TaskForm, today: string): TaskBuildResult {
  const titulo = form.titulo.trim();
  if (titulo === '') {
    return { ok: false, field: 'titulo', message: 'Escribí qué tenés que hacer.' };
  }
  if (titulo.length > MAX_TASK_TITLE) {
    return {
      ok: false,
      field: 'titulo',
      message: `El texto es muy largo (máximo ${MAX_TASK_TITLE} caracteres).`,
    };
  }
  const fecha = parseDateAr(form.fecha);
  if (fecha === null) {
    return { ok: false, field: 'fecha', message: 'Ingresá la fecha como DD/MM/AAAA.' };
  }
  if (fecha < today) {
    return { ok: false, field: 'fecha', message: 'La fecha ya pasó.' };
  }
  return { ok: true, input: { titulo, fecha } };
}
