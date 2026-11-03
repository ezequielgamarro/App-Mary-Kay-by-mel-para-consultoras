const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Argentina no tiene horario de verano: siempre es UTC-3. */
const ARGENTINA_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Fecha de hoy en Argentina como AAAA-MM-DD (no la del huso del teléfono ni la UTC). */
export function todayIso(now: Date = new Date()): string {
  return new Date(now.getTime() - ARGENTINA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Convierte «DD/MM/AAAA» a AAAA-MM-DD, o null si no es una fecha real. */
export function parseDateAr(text: string): string | null {
  const match = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real || year < 2000) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Muestra AAAA-MM-DD como «DD/MM/AAAA» (vacío si no es una fecha válida). */
export function formatDateAr(iso: string | null): string {
  const match = iso ? ISO_DATE.exec(iso) : null;
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

/** Suma (o resta) días a una fecha AAAA-MM-DD. */
export function addDays(iso: string, days: number): string {
  const match = ISO_DATE.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Días enteros desde `from` hasta `to` (negativo si `to` es anterior). Ambas en AAAA-MM-DD. */
export function daysBetween(from: string, to: string): number {
  const a = ISO_DATE.exec(from);
  const b = ISO_DATE.exec(to);
  if (!a || !b) return 0;
  const ms = Date.UTC(+b[1], +b[2] - 1, +b[3]) - Date.UTC(+a[1], +a[2] - 1, +a[3]);
  return Math.round(ms / 86_400_000);
}
