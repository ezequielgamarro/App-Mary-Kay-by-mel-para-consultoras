export const GENERIC_ERROR = 'No pudimos completar la acción. Revisá tu conexión y probá de nuevo.';

/** Códigos propios de las reglas de la base (ver la migración de pedidos): BP001 a BP003. */
const BUSINESS_CODE = /^BP00[1-3]$/;

/** Mensaje para la usuaria: las reglas de negocio llegan redactadas; lo técnico se oculta. */
export function orderErrorMessage(error: object): string {
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  if (BUSINESS_CODE.test(code) && message.trim() !== '') return message.trim();
  return GENERIC_ERROR;
}
