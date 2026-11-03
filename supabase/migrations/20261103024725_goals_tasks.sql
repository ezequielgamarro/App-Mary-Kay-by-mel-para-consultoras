-- Metas mensuales y tareas de la agenda.
--
-- Modelo de acceso:
--   * Cada consultora ve y modifica solo lo suyo (user_id = auth.uid()).
--   * `user_id` lo pone la base (default auth.uid()): el cliente no puede escribirlo.
--   * No hay política para la directora; si más adelante ve metas, será mediante una
--     función controlada que respete el permiso de compartir (módulo Equipo).
--
-- Dinero en centavos enteros (bigint).

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Primer día del mes al que corresponde la meta (AAAA-MM-01).
  mes date not null check (extract(day from mes) = 1),
  ventas_centavos bigint not null default 0 check (ventas_centavos between 0 and 1000000000000000),
  -- La meta de ganancia es opcional.
  ganancia_centavos bigint check (ganancia_centavos is null or ganancia_centavos between 0 and 1000000000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mes)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  fecha date not null,
  hecha boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- (user_id, mes) ya tiene índice por la restricción unique.
-- Pendientes por fecha: la consulta típica de la agenda.
create index tasks_user_id_fecha_idx on public.tasks (user_id, fecha) where not hecha;

-- Permisos mínimos para la Data API (desde 2026-10-30 no hay grants automáticos).
revoke all on public.goals, public.tasks from anon, authenticated;
grant select, delete on public.goals, public.tasks to authenticated;
grant insert (mes, ventas_centavos, ganancia_centavos) on public.goals to authenticated;
grant update (ventas_centavos, ganancia_centavos) on public.goals to authenticated;
grant insert (titulo, fecha) on public.tasks to authenticated;
grant update (titulo, fecha, hecha) on public.tasks to authenticated;

alter table public.goals enable row level security;
alter table public.tasks enable row level security;

create policy goals_select_propias on public.goals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy goals_insert_propias on public.goals
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy goals_update_propias on public.goals
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy goals_delete_propias on public.goals
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy tasks_select_propias on public.tasks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy tasks_insert_propias on public.tasks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tasks_update_propias on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tasks_delete_propias on public.tasks
  for delete to authenticated using ((select auth.uid()) = user_id);

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function private.set_updated_at();
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function private.set_updated_at();

-- Reversión (no se ejecuta; guardada por si hay que deshacer):
--   drop table if exists public.tasks, public.goals;
