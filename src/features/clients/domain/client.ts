import { z } from 'zod';

export type Client = {
  id: string;
  nombre: string;
  telefono: string | null;
  /** Fecha ISO (AAAA-MM-DD). El año es 2000 cuando la clienta solo dio día y mes. */
  cumpleanos: string | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Datos que la consultora carga o edita, ya validados y normalizados. */
export type ClientInput = {
  nombre: string;
  telefono: string | null;
  cumpleanos: string | null;
  notas: string | null;
};

/** Año fijo para guardar cumpleaños sin año (bisiesto, así existe el 29/02). */
const BIRTHDAY_YEAR = 2000;

/** Convierte «DD/MM» a fecha ISO, o null si no es una fecha real. */
export function birthdayFromDayMonth(text: string): string | null {
  const match = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(Date.UTC(BIRTHDAY_YEAR, month - 1, day));
  const real =
    date.getUTCFullYear() === BIRTHDAY_YEAR &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!real) return null;
  return `${BIRTHDAY_YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Muestra una fecha ISO como «DD/MM» (sin año). */
export function birthdayToDayMonth(iso: string | null): string {
  if (!iso) return '';
  const [, month, day] = iso.split('-');
  return month && day ? `${day}/${month}` : '';
}

const emptyToNull = (value: string) => (value.trim() === '' ? null : value.trim());

/** Entrada cruda del formulario: todos los campos son texto. */
export const clientFormSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, { error: 'Ingresá el nombre de la clienta.' })
      .max(120, { error: 'El nombre es muy largo (máximo 120).' }),
    telefono: z
      .string()
      .max(30, { error: 'El teléfono es muy largo (máximo 30).' })
      .transform(emptyToNull),
    cumpleanos: z.string().transform(emptyToNull),
    notas: z
      .string()
      .max(2000, { error: 'Las notas son muy largas (máximo 2000).' })
      .transform(emptyToNull),
  })
  .transform((value, ctx): ClientInput => {
    let cumpleanos: string | null = null;
    if (value.cumpleanos !== null) {
      cumpleanos = birthdayFromDayMonth(value.cumpleanos);
      if (cumpleanos === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['cumpleanos'],
          message: 'El cumpleaños debe ser una fecha real con formato DD/MM, por ejemplo 15/03.',
        });
        return z.NEVER;
      }
    }
    return { ...value, cumpleanos };
  });

export type ClientForm = z.input<typeof clientFormSchema>;

/**
 * Arma el enlace de WhatsApp para un teléfono argentino, o null si no se puede
 * normalizar con seguridad. Acepta «11 5555-0000», «011 5555-0000» y «+54 9 11 5555-0000».
 * No interpreta el «15»: pedir el número con código de área y sin 15.
 */
export function whatsappUrl(telefono: string | null, mensaje?: string): string | null {
  if (!telefono) return null;
  let digits = telefono.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('54')) {
    digits = digits.slice(2);
    if (digits.startsWith('9')) digits = digits.slice(1);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10) return null;
  const base = `https://wa.me/549${digits}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/** Filtra por nombre o teléfono, sin distinguir mayúsculas ni tildes. */
export function filterClients(clients: Client[], query: string): Client[] {
  const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const needle = normalize(query.trim());
  if (!needle) return clients;
  return clients.filter(
    (client) =>
      normalize(client.nombre).includes(needle) || (client.telefono ?? '').includes(needle),
  );
}
