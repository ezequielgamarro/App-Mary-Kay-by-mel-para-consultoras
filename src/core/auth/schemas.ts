import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Ingresá un correo válido.' }));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Ingresá tu contraseña.' }),
});

export const signUpSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, { error: 'Ingresá tu nombre.' })
    .max(120, { error: 'El nombre es muy largo (máximo 120).' }),
  email: emailSchema,
  password: z.string().min(8, { error: 'La contraseña debe tener al menos 8 caracteres.' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

/** Devuelve el primer mensaje de error de validación, o null si los datos son válidos. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Revisá los datos ingresados.';
}

/** Traduce los errores de Supabase Auth a mensajes en español sin filtrar detalles internos. */
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.';
    case 'email_not_confirmed':
      return 'Confirmá tu correo desde el mensaje que te enviamos.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Ya existe una cuenta con ese correo.';
    case 'weak_password':
      return 'La contraseña es muy débil. Probá con una más larga.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Demasiados intentos. Esperá unos minutos y volvé a probar.';
    default:
      return 'No pudimos completar la acción. Revisá tu conexión y probá de nuevo.';
  }
}
