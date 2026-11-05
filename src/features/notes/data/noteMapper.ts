import type { Note, NoteInput } from '../domain/note';

/** Fila tal como la devuelve la tabla `public.notes`. */
export type NoteRow = { id: string; titulo: string; contenido: string; updated_at: string };

export const NOTE_COLUMNS = 'id, titulo, contenido, updated_at';

export function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    titulo: row.titulo,
    contenido: row.contenido,
    updatedAt: row.updated_at,
  };
}

/** Solo las columnas que la consultora puede escribir (`user_id` lo pone la base). */
export function toWritableRow(input: NoteInput) {
  return { titulo: input.titulo, contenido: input.contenido };
}
