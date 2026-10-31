import { readEnv } from './env';

describe('readEnv', () => {
  it('devuelve la configuración válida', () => {
    const env = readEnv({
      EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
    });
    expect(env.EXPO_PUBLIC_SUPABASE_URL).toBe('https://abc.supabase.co');
  });

  it('falla con un mensaje claro si falta algo', () => {
    expect(() => readEnv({})).toThrow(/Falta configurar/);
  });

  it('rechaza una URL inválida', () => {
    expect(() =>
      readEnv({
        EXPO_PUBLIC_SUPABASE_URL: 'no-es-url',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'k',
      }),
    ).toThrow();
  });
});
