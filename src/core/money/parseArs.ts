/** Máximo que acepta la base de datos (`check` de las columnas en centavos): $ 1.000.000.000. */
export const MAX_CENTS = 100_000_000_000;

/**
 * Convierte lo que escribe la usuaria a centavos enteros, sin usar decimales flotantes.
 * Acepta «1234», «1.234», «1.234,50», «1234,5», «12.50» y un «$» opcional.
 * Devuelve null si el texto no es un importe claro o supera el máximo.
 */
export function parseArs(text: string): number | null {
  const clean = text.replace(/\$/g, '').replace(/\s/g, '');
  if (clean === '') return null;

  let pesos: string;
  let decimals = '';
  let match: RegExpExecArray | null;
  if ((match = /^(\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/.exec(clean))) {
    pesos = match[1].replace(/\./g, '');
    decimals = match[2] ?? '';
  } else if ((match = /^(\d+)(?:,(\d{1,2}))?$/.exec(clean))) {
    pesos = match[1];
    decimals = match[2] ?? '';
  } else if ((match = /^(\d+)\.(\d{1,2})$/.exec(clean))) {
    pesos = match[1];
    decimals = match[2];
  } else {
    return null;
  }

  const cents = Number(pesos) * 100 + Number(decimals.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents <= MAX_CENTS ? cents : null;
}

/** Muestra centavos para editarlos en un campo: 123450 → «1234,50» (sin símbolo ni miles). */
export function centsToInput(cents: number): string {
  const pesos = Math.floor(cents / 100);
  const remainder = cents % 100;
  return remainder === 0 ? String(pesos) : `${pesos},${String(remainder).padStart(2, '0')}`;
}
