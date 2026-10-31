import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Lee la configuración pública del cliente. Expo solo reemplaza las variables
 * `EXPO_PUBLIC_*` cuando se acceden por nombre completo, por eso se listan una a una.
 * La clave publishable es pública por diseño; los secretos nunca van en el cliente.
 */
export function readEnv(
  source: Record<string, string | undefined> = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      'Falta configurar EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el archivo .env (ver docs/ARQUITECTURA.md).',
    );
  }
  return result.data;
}
