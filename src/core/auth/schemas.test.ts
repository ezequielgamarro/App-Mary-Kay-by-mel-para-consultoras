import { authErrorMessage, firstError, loginSchema, signUpSchema } from './schemas';

describe('loginSchema', () => {
  it('normaliza el correo', () => {
    const r = loginSchema.parse({ email: '  Ana@Mail.COM ', password: 'x' });
    expect(r.email).toBe('ana@mail.com');
  });
  it('rechaza correo inválido y contraseña vacía', () => {
    expect(loginSchema.safeParse({ email: 'ana', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
});

describe('signUpSchema', () => {
  const ok = { nombre: ' Ana ', email: 'a@b.co', password: '12345678' };
  it('acepta datos válidos y recorta el nombre', () => {
    expect(signUpSchema.parse(ok).nombre).toBe('Ana');
  });
  it('exige 8 caracteres de contraseña', () => {
    const r = signUpSchema.safeParse({ ...ok, password: '1234567' });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstError(r.error)).toMatch(/8 caracteres/);
  });
  it('rechaza nombre vacío o de más de 120 caracteres', () => {
    expect(signUpSchema.safeParse({ ...ok, nombre: '  ' }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, nombre: 'a'.repeat(121) }).success).toBe(false);
  });
});

describe('authErrorMessage', () => {
  it('traduce códigos conocidos', () => {
    expect(authErrorMessage('invalid_credentials')).toMatch(/incorrectos/);
    expect(authErrorMessage('email_exists')).toMatch(/Ya existe/);
  });
  it('usa un mensaje genérico para códigos desconocidos', () => {
    expect(authErrorMessage('algo_raro')).toMatch(/No pudimos/);
    expect(authErrorMessage(undefined)).toMatch(/No pudimos/);
  });
});
