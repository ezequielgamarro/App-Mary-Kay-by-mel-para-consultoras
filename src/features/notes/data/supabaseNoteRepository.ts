import type { RepoResult } from '@/core/data/repoResult';
import { supabase } from '@/core/supabase/client';

import type { NoteRepository } from '../domain/noteRepository';
import { NOTE_COLUMNS, toNote, toWritableRow, type NoteRow } from './noteMapper';

const GENERIC_ERROR = 'No pudimos completar la acción. Revisá tu conexión y probá de nuevo.';

function fail<T>(error: object): RepoResult<T> {
  // El detalle técnico va solo al log; la usuaria ve un mensaje claro.
  console.warn('[notas] error de Supabase', error);
  return { ok: false, message: GENERIC_ERROR };
}

export const supabaseNoteRepository: NoteRepository = {
  async list() {
    const { data, error } = await supabase
      .from('notes')
      .select(NOTE_COLUMNS)
      .order('updated_at', { ascending: false })
      .limit(500)
      .returns<NoteRow[]>();
    if (error) return fail(error);
    return { ok: true, data: data.map(toNote) };
  },

  async get(id) {
    const { data, error } = await supabase
      .from('notes')
      .select(NOTE_COLUMNS)
      .eq('id', id)
      .maybeSingle<NoteRow>();
    if (error) return fail(error);
    return { ok: true, data: data ? toNote(data) : null };
  },

  async create(input) {
    const { data, error } = await supabase
      .from('notes')
      .insert(toWritableRow(input))
      .select(NOTE_COLUMNS)
      .single<NoteRow>();
    if (error) return fail(error);
    return { ok: true, data: toNote(data) };
  },

  async update(id, input) {
    const { data, error } = await supabase
      .from('notes')
      .update(toWritableRow(input))
      .eq('id', id)
      .select(NOTE_COLUMNS)
      .single<NoteRow>();
    if (error) return fail(error);
    return { ok: true, data: toNote(data) };
  },

  async remove(id) {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) return fail(error);
    return { ok: true, data: null };
  },
};
