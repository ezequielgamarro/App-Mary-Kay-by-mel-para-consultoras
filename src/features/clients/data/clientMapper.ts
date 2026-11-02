import type { Client, ClientInput } from '../domain/client';

/** Fila tal como la devuelve la tabla `public.clients`. */
export type ClientRow = {
  id: string;
  nombre: string;
  telefono: string | null;
  cumpleanos: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export const CLIENT_COLUMNS = 'id, nombre, telefono, cumpleanos, notas, created_at, updated_at';

export function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono,
    cumpleanos: row.cumpleanos,
    notas: row.notas,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Solo las columnas que la consultora puede escribir (`user_id` lo pone la base). */
export function toWritableRow(input: ClientInput) {
  return {
    nombre: input.nombre,
    telefono: input.telefono,
    cumpleanos: input.cumpleanos,
    notas: input.notas,
  };
}
