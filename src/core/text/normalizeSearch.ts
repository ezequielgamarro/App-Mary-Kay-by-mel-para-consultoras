/** Normaliza texto para buscar: sin tildes, en minúsculas y sin espacios en los bordes. */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}
