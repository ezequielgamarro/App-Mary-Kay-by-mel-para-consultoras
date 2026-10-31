/** Formatea un importe en centavos como pesos argentinos: 61230000 → «$ 612.300». */
export function formatArs(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const pesos = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  const integerPart = pesos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimals = remainder === 0 ? '' : `,${remainder.toString().padStart(2, '0')}`;
  return `${sign}$ ${integerPart}${decimals}`;
}
