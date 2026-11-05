import { useCallback } from 'react';

import { useLoad } from '@/core/data/useLoad';

import { supabaseNoteRepository } from '../data/supabaseNoteRepository';
import { buildNoteInput, type Note, type NoteForm } from '../domain/note';
import type { NoteRepository, RepoResult } from '../domain/noteRepository';

export function useNoteList(repository: NoteRepository = supabaseNoteRepository) {
  const load = useCallback(() => repository.list(), [repository]);
  return useLoad<Note[]>(load, 'notes');
}

/** Una nota por id; sin id (nota nueva) devuelve «no hay nota». */
export function useNote(
  id: string | undefined,
  repository: NoteRepository = supabaseNoteRepository,
) {
  const load = useCallback(
    () =>
      id ? repository.get(id) : Promise.resolve<RepoResult<Note | null>>({ ok: true, data: null }),
    [id, repository],
  );
  return useLoad<Note | null>(load, id ? `note:${id}` : undefined);
}

export type SaveNoteResult =
  { ok: true; note: Note } | { ok: false; message: string; field?: keyof NoteForm };

export type ActionResult = { ok: true } | { ok: false; message: string };

/** Casos de uso de escritura: validan el formulario y delegan en el repositorio. */
export function useNoteActions(repository: NoteRepository = supabaseNoteRepository) {
  /** Crea la nota o, si se pasa `id`, la actualiza. */
  const save = useCallback(
    async (form: NoteForm, id?: string): Promise<SaveNoteResult> => {
      const built = buildNoteInput(form);
      if (!built.ok) return { ok: false, message: built.message, field: built.field };
      const result = id
        ? await repository.update(id, built.input)
        : await repository.create(built.input);
      return result.ok ? { ok: true, note: result.data } : { ok: false, message: result.message };
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

  return { save, remove };
}
