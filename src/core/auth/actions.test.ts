import { signIn, signUp } from './actions';

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();

jest.mock('../supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: jest.fn(),
    },
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('signIn', () => {
  it('no llama a Supabase si los datos son inválidos', async () => {
    const r = await signIn({ email: 'mal', password: 'x' });
    expect(r.ok).toBe(false);
    expect(mockSignIn).not.toHaveBeenCalled();
  });
  it('traduce credenciales incorrectas', async () => {
    mockSignIn.mockResolvedValue({ error: { code: 'invalid_credentials' } });
    const r = await signIn({ email: 'a@b.co', password: 'x' });
    expect(r).toEqual({ ok: false, message: 'Correo o contraseña incorrectos.' });
  });
  it('devuelve ok con credenciales válidas', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    expect(await signIn({ email: 'A@b.co', password: 'x' })).toEqual({ ok: true });
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'a@b.co', password: 'x' });
  });
});

describe('signUp', () => {
  const input = { nombre: 'Ana', email: 'a@b.co', password: '12345678' };
  it('envía el nombre en los metadatos', async () => {
    mockSignUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });
    const r = await signUp(input);
    expect(r).toEqual({ ok: true, needsEmailConfirmation: false });
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: '12345678',
      options: { data: { nombre: 'Ana' } },
    });
  });
  it('avisa que hay que confirmar el correo si no hay sesión', async () => {
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null });
    expect(await signUp(input)).toEqual({ ok: true, needsEmailConfirmation: true });
  });
  it('rechaza contraseña corta sin llamar a Supabase', async () => {
    const r = await signUp({ ...input, password: '123' });
    expect(r.ok).toBe(false);
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});
