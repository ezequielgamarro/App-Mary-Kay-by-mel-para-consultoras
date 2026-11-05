import { useCallback } from 'react';

import { useLoad } from '@/core/data/useLoad';

import { supabaseClientRepository } from '../data/supabaseClientRepository';
import { clientFormSchema, type Client, type ClientForm } from '../domain/client';
import type { ClientRepository, RepoResult } from '../domain/clientRepository';

export function useClientList(repository: ClientRepository = supabaseClientRepository) {
  const load = useCallback(() => repository.list(), [repository]);
  return useLoad<Client[]>(load, 'clients');
}

export function useClient(
  id: string | undefined,
  repository: ClientRepository = supabaseClientRepository,
) {
  const load = useCallback(
    () =>
      id
        ? repository.get(id)
        : Promise.resolve<RepoResult<Client | null>>({ ok: true, data: null }),
    [id, repository],
  );
  return useLoad<Client | null>(load, id ? `client:${id}` : undefined);
}

export type SaveResult =
  { ok: true; client: Client } | { ok: false; message: string; field?: keyof ClientForm };

/** Casos de uso de escritura: validan el formulario y delegan en el repositorio. */
export function useClientActions(repository: ClientRepository = supabaseClientRepository) {
  const save = useCallback(
    async (id: string | null, form: ClientForm): Promise<SaveResult> => {
      const parsed = clientFormSchema.safeParse(form);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const field = issue?.path[0];
        return {
          ok: false,
          message: issue?.message ?? 'Revisá los datos ingresados.',
          field: typeof field === 'string' ? (field as keyof ClientForm) : undefined,
        };
      }
      const result = id
        ? await repository.update(id, parsed.data)
        : await repository.create(parsed.data);
      return result.ok ? { ok: true, client: result.data } : { ok: false, message: result.message };
    },
    [repository],
  );

  const remove = useCallback((id: string) => repository.remove(id), [repository]);

  return { save, remove };
}
