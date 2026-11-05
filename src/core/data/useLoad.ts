import { useCallback, useEffect, useState } from 'react';

import { readCache, writeCache } from './offlineCache';
import type { RepoResult } from './repoResult';

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  /** `stale` es verdadero cuando no hubo conexión y se muestra la última copia guardada. */
  | { status: 'ready'; data: T; stale?: boolean };

/**
 * Carga un recurso al montar y expone `retry` (con indicador) y `refresh` (sin parpadeo).
 * Con `cacheKey`, guarda lo último que cargó bien y, si una carga falla, muestra esa copia
 * marcada como `stale` en vez de un error.
 */
export function useLoad<T>(load: () => Promise<RepoResult<T>>, cacheKey?: string) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    load().then(async (result) => {
      if (result.ok) {
        if (cacheKey) void writeCache(cacheKey, result.data);
        if (active) setState({ status: 'ready', data: result.data });
        return;
      }
      const cached = cacheKey ? await readCache<T>(cacheKey) : null;
      if (!active) return;
      setState(
        cached !== null
          ? { status: 'ready', data: cached, stale: true }
          : { status: 'error', message: result.message },
      );
    });
    return () => {
      active = false;
    };
  }, [load, attempt, cacheKey]);

  /** Vuelve a cargar mostrando el indicador de carga (para «Reintentar»). */
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  /** Vuelve a cargar sin parpadeo: conserva lo que ya se ve hasta que llegue lo nuevo. */
  const refresh = useCallback(() => setAttempt((value) => value + 1), []);

  return { state, retry, refresh };
}
