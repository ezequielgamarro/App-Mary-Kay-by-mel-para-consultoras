import { normalizeSearch } from '@/core/text/normalizeSearch';

export type Note = {
  id: string;
  titulo: string;
  contenido: string;
  /** Marca de tiempo ISO de la última modificación. */
  updatedAt: string;
};

export type NoteInput = { titulo: string; contenido: string };

/** Lo que escribe la usuaria. */
export type NoteForm = { titulo: string; contenido: string };

export const MAX_NOTE_TITLE = 120;
export const MAX_NOTE_BODY = 10000;

export type NoteBuildResult =
  { ok: true; input: NoteInput } | { ok: false; field: keyof NoteForm; message: string };

/** Valida la nota: título obligatorio y largos dentro de lo que acepta la base. */
export function buildNoteInput(form: NoteForm): NoteBuildResult {
  const titulo = form.titulo.trim();
  if (titulo === '') return { ok: false, field: 'titulo', message: 'Poné un título a la nota.' };
  if (titulo.length > MAX_NOTE_TITLE) {
    return {
      ok: false,
      field: 'titulo',
      message: `El título es muy largo (máximo ${MAX_NOTE_TITLE} caracteres).`,
    };
  }
  if (form.contenido.length > MAX_NOTE_BODY) {
    return {
      ok: false,
      field: 'contenido',
      message: `La nota es muy larga (máximo ${MAX_NOTE_BODY} caracteres).`,
    };
  }
  return { ok: true, input: { titulo, contenido: form.contenido.trim() } };
}

/** Notas cuyo título o contenido contiene el texto buscado (sin importar tildes ni mayúsculas). */
export function filterNotes(notes: Note[], query: string): Note[] {
  const needle = normalizeSearch(query);
  if (needle === '') return notes;
  return notes.filter((note) =>
    normalizeSearch(`${note.titulo} ${note.contenido}`).includes(needle),
  );
}

/** Primera línea con texto del contenido, recortada, para mostrar como vista previa. */
export function notePreview(note: Note, max = 80): string {
  const line = note.contenido.split('\n').find((l) => l.trim() !== '') ?? '';
  const text = line.trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
