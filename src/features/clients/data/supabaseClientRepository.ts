import { supabase } from '@/core/supabase/client';

import type { ClientRepository, RepoResult } from '../domain/clientRepository';
import { CLIENT_COLUMNS, toClient, toWritableRow, type ClientRow } from './clientMapper';

const GENERIC_ERROR = 'No pudimos completar la acción. Revisá tu conexión y probá de nuevo.';
const HAS_SALES =
  'Esta clienta tiene ventas registradas, por eso no se puede eliminar. Si ya no la necesitás, podés dejarla como está.';

function fail<T>(error: object): RepoResult<T> {
  // El detalle técnico va solo al log; la usuaria ve un mensaje claro.
  console.warn('[clients] error de Supabase', error);
  // 23503 = clave foránea: la clienta está en ventas (las ventas la protegen con `restrict`).
  const code = 'code' in error ? error.code : undefined;
  return { ok: false, message: code === '23503' ? HAS_SALES : GENERIC_ERROR };
}

export const supabaseClientRepository: ClientRepository = {
  async list() {
    const { data, error } = await supabase
      .from('clients')
      .select(CLIENT_COLUMNS)
      .order('nombre', { ascending: true })
      .returns<ClientRow[]>();
    if (error) return fail(error);
    return { ok: true, data: data.map(toClient) };
  },

  async get(id) {
    const { data, error } = await supabase
      .from('clients')
      .select(CLIENT_COLUMNS)
      .eq('id', id)
      .maybeSingle<ClientRow>();
    if (error) return fail(error);
    return { ok: true, data: data ? toClient(data) : null };
  },

  async create(input) {
    const { data, error } = await supabase
      .from('clients')
      .insert(toWritableRow(input))
      .select(CLIENT_COLUMNS)
      .single<ClientRow>();
    if (error) return fail(error);
    return { ok: true, data: toClient(data) };
  },

  async update(id, input) {
    const { data, error } = await supabase
      .from('clients')
      .update(toWritableRow(input))
      .eq('id', id)
      .select(CLIENT_COLUMNS)
      .single<ClientRow>();
    if (error) return fail(error);
    return { ok: true, data: toClient(data) };
  },

  async remove(id) {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) return fail(error);
    return { ok: true, data: null };
  },
};
