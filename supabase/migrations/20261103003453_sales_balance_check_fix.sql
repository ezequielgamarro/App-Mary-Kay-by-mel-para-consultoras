-- Corrección de `sales_check_client`: el trigger diferido recibe la fila tal como quedó en cada
-- UPDATE intermedio (p. ej. con los productos ya sumados pero sin el pago), no su estado final.
-- Por eso rechazaba ventas de mostrador (sin clienta) pagadas completas. Ahora la función relee
-- la venta al momento de validar (fin de la transacción) y decide con el estado definitivo.
-- SECURITY DEFINER solo para poder leer la venta con independencia de RLS; no escribe nada.

create or replace function private.sales_check_client_for_balance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select estado, client_id, saldo_centavos into s from public.sales where id = new.id;
  if found and s.estado = 'activa' and s.client_id is null and s.saldo_centavos > 0 then
    raise exception 'Para dejar saldo pendiente elegí una clienta.' using errcode = 'BG003';
  end if;
  return null;
end;
$$;

revoke execute on function private.sales_check_client_for_balance() from public, anon, authenticated, service_role;

-- Reversión (no se ejecuta): volver a la versión anterior de la función, que leía `new`:
--   create or replace function private.sales_check_client_for_balance() returns trigger
--   language plpgsql set search_path = '' as $f$ begin
--     if new.estado = 'activa' and new.client_id is null and new.saldo_centavos > 0 then
--       raise exception 'Para dejar saldo pendiente elegí una clienta.' using errcode = 'BG003';
--     end if; return null; end; $f$;
