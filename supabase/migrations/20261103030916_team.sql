-- Equipo: vínculo consultora → directora por código de invitación.
--
-- Modelo de acceso:
--   * Cada perfil tiene un `codigo_invitacion` propio (lo comparte con quien quiera sumar a su equipo).
--   * `patrocinadora_id` y `comparte_con_patrocinadora` NO se escriben desde el cliente (las
--     columnas no tienen grant de UPDATE): solo las funciones de abajo las cambian.
--   * La consultora se une con el código de su directora; al unirse acepta compartir. Puede
--     revocarlo (`set_team_sharing(false)`) o salir del equipo (`leave_team()`).
--   * La directora ve ÚNICAMENTE: nombre, ventas del mes en pesos, cantidad de ventas y meta de
--     ventas del mes, y solo de quienes comparten. Nunca clientas, deudas, productos ni pagos.
--   * Son SECURITY DEFINER porque leen datos de otras usuarias; verifican `auth.uid()` a mano,
--     usan search_path vacío y solo las puede ejecutar `authenticated`.
--
-- Códigos de error propios (la app muestra el mensaje tal cual):
--   BT001 código inexistente        BT004 el código es de alguien de su propio equipo (ciclo)
--   BT002 es su propio código       BT005 todavía no está en un equipo
--   BT003 ya está en un equipo      BT006 la integrante no es de su equipo

alter table public.profiles
  add column codigo_invitacion text not null
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
    check (codigo_invitacion ~ '^[A-Z0-9]{10}$'),
  add column comparte_con_patrocinadora boolean not null default false,
  add constraint profiles_codigo_invitacion_key unique (codigo_invitacion);

-- Unirse a un equipo con el código de la directora (acepta compartir al unirse).
create function public.join_team(p_codigo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_director uuid;
  v_cursor uuid;
  v_hops int := 0;
begin
  if v_me is null then
    raise exception 'Iniciá sesión para continuar.' using errcode = '28000';
  end if;

  select id into v_director from public.profiles
  where codigo_invitacion = upper(btrim(coalesce(p_codigo, '')));
  if v_director is null then
    raise exception 'No encontramos ese código. Revisalo con tu directora.' using errcode = 'BT001';
  end if;
  if v_director = v_me then
    raise exception 'Ese es tu propio código.' using errcode = 'BT002';
  end if;
  if exists (select 1 from public.profiles where id = v_me and patrocinadora_id is not null) then
    raise exception 'Ya estás en un equipo. Salí del actual para unirte a otro.' using errcode = 'BT003';
  end if;

  -- Evita ciclos: la directora elegida no puede colgar de quien se une.
  v_cursor := v_director;
  while v_cursor is not null and v_hops < 100 loop
    if v_cursor = v_me then
      raise exception 'Ese código es de alguien de tu propio equipo.' using errcode = 'BT004';
    end if;
    select patrocinadora_id into v_cursor from public.profiles where id = v_cursor;
    v_hops := v_hops + 1;
  end loop;

  update public.profiles
  set patrocinadora_id = v_director, comparte_con_patrocinadora = true
  where id = v_me;
end;
$$;

-- Salir del equipo: se corta el vínculo y se deja de compartir.
create function public.leave_team()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set patrocinadora_id = null, comparte_con_patrocinadora = false
  where id = auth.uid();
end;
$$;

-- Dejar de compartir (o volver a hacerlo) sin salir del equipo.
create function public.set_team_sharing(p_comparte boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and patrocinadora_id is not null
  ) then
    raise exception 'Todavía no estás en un equipo.' using errcode = 'BT005';
  end if;
  update public.profiles
  set comparte_con_patrocinadora = coalesce(p_comparte, false)
  where id = auth.uid();
end;
$$;

-- La directora saca a una integrante de su equipo.
create function public.remove_team_member(p_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  update public.profiles
  set patrocinadora_id = null, comparte_con_patrocinadora = false
  where id = p_member and patrocinadora_id = auth.uid();
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Esa persona no es parte de tu equipo.' using errcode = 'BT006';
  end if;
end;
$$;

-- Mi situación: mi código, mi directora (si tengo) y cuántas integrantes tengo.
create function public.my_team()
returns table (
  codigo text,
  patrocinadora_nombre text,
  comparte boolean,
  integrantes integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    me.codigo_invitacion,
    d.nombre,
    me.comparte_con_patrocinadora,
    (select count(*)::int from public.profiles m where m.patrocinadora_id = me.id)
  from public.profiles me
  left join public.profiles d on d.id = me.patrocinadora_id
  where me.id = auth.uid();
$$;

-- Resumen para la directora: solo integrantes directas. Los importes son null si no comparten.
create function public.team_summary()
returns table (
  member_id uuid,
  nombre text,
  comparte boolean,
  ventas_mes_centavos bigint,
  cantidad_ventas integer,
  meta_ventas_centavos bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with month as (
    select date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires')::date as start
  )
  select
    p.id,
    p.nombre,
    p.comparte_con_patrocinadora,
    case when p.comparte_con_patrocinadora then
      (select coalesce(sum(s.total_centavos), 0)::bigint from public.sales s, month m
       where s.user_id = p.id and s.estado = 'activa'
         and s.vendida_el >= m.start and s.vendida_el < (m.start + interval '1 month')::date)
    end,
    case when p.comparte_con_patrocinadora then
      (select count(*)::int from public.sales s, month m
       where s.user_id = p.id and s.estado = 'activa'
         and s.vendida_el >= m.start and s.vendida_el < (m.start + interval '1 month')::date)
    end,
    case when p.comparte_con_patrocinadora then
      (select g.ventas_centavos from public.goals g, month m where g.user_id = p.id and g.mes = m.start)
    end
  from public.profiles p
  where p.patrocinadora_id = auth.uid()
  order by p.nombre, p.id;
$$;

revoke execute on function public.join_team(text) from public, anon;
revoke execute on function public.leave_team() from public, anon;
revoke execute on function public.set_team_sharing(boolean) from public, anon;
revoke execute on function public.remove_team_member(uuid) from public, anon;
revoke execute on function public.my_team() from public, anon;
revoke execute on function public.team_summary() from public, anon;
grant execute on function public.join_team(text) to authenticated;
grant execute on function public.leave_team() to authenticated;
grant execute on function public.set_team_sharing(boolean) to authenticated;
grant execute on function public.remove_team_member(uuid) to authenticated;
grant execute on function public.my_team() to authenticated;
grant execute on function public.team_summary() to authenticated;

-- Reversión (no se ejecuta; guardada por si hay que deshacer):
--   drop function if exists public.team_summary(), public.my_team(), public.remove_team_member(uuid),
--     public.set_team_sharing(boolean), public.leave_team(), public.join_team(text);
--   alter table public.profiles drop column if exists comparte_con_patrocinadora,
--     drop column if exists codigo_invitacion;
