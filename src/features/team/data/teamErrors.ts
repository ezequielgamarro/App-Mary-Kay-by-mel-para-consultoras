export const GENERIC_ERROR = 'No pudimos completar la acción. Revisá tu conexión y probá de nuevo.';

/** Códigos propios de las reglas de equipo (ver la migración): BT001 a BT006. */
const BUSINESS_CODE = /^BT00[1-6]$/;

/**
 * Mensaje para la usuaria a partir de un error de Supabase. Las reglas de equipo (código
 * inexistente, ya está en un equipo, ciclo…) llegan de la base con un texto ya redactado en
 * español; cualquier otro error es técnico y se oculta.
 */
export function teamErrorMessage(error: object): string {
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  if (BUSINESS_CODE.test(code) && message.trim() !== '') return message.trim();
  return GENERIC_ERROR;
}
