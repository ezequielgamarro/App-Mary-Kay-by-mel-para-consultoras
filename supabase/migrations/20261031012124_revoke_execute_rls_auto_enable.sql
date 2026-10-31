-- rls_auto_enable() ya existía en el proyecto: la usa el event trigger
-- `ensure_rls` para activar RLS en cada tabla nueva de `public`. Estaba
-- expuesta a `anon` y `authenticated` por la Data API (aviso del linter).
-- El event trigger sigue funcionando: lo ejecuta el dueño, no los roles de la API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Reversión (no se ejecuta):
--   grant execute on function public.rls_auto_enable() to public, anon, authenticated;
