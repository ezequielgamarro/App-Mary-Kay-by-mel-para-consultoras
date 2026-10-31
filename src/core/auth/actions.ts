import { supabase } from '../supabase/client';
import {
  authErrorMessage,
  firstError,
  loginSchema,
  signUpSchema,
  type LoginInput,
  type SignUpInput,
} from './schemas';

export type AuthResult =
  { ok: true; needsEmailConfirmation?: boolean } | { ok: false; message: string };

export async function signIn(input: LoginInput): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  return error ? { ok: false, message: authErrorMessage(error.code) } : { ok: true };
}

export async function signUp(input: SignUpInput): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };

  const { nombre, email, password } = parsed.data;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre } },
  });
  if (error) return { ok: false, message: authErrorMessage(error.code) };
  // Sin sesión inmediata, el proyecto exige confirmar el correo.
  return { ok: true, needsEmailConfirmation: data.session === null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
