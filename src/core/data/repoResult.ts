/** Resultado de una operación de repositorio: éxito con datos o error con mensaje para la usuaria. */
export type RepoResult<T> = { ok: true; data: T } | { ok: false; message: string };
