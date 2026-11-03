import { useCallback, useEffect, useState } from 'react';

import type { RepoResult } from './repoResult';

export type LoadState<T> =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

/** Carga un recurso al montar y expone `retry` (con indicador) y `refresh` (sin parpadeo). */
export function useLoad<T>(load: () => Promise<RepoResult<T>>) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    load().then((result) => {
      if (!active) return;
      setState(
        result.ok
          ? { status: 'ready', data: result.data }
          : { status: 'error', message: result.message },
      );
    });
    return () => {
      active = false;
    };
  }, [load, attempt]);

  /** Vuelve a cargar mostrando el indicador de carga (para «Reintentar»). */
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  /** Vuelve a cargar sin parpadeo: conserva lo que ya se ve hasta que llegue lo nuevo. */
  const refresh = useCallback(() => setAttempt((value) => value + 1), []);

  return { state, retry, refresh };
}
