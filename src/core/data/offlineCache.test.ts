import { bindCacheToUser, clearCache, readCache, writeCache } from './offlineCache';

const mockStore = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStore.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mockStore.set(key, value);
    },
    removeItem: async (key: string) => mockStore.delete(key),
    getAllKeys: async () => [...mockStore.keys()],
  },
}));

beforeEach(() => mockStore.clear());

describe('offlineCache', () => {
  it('guarda y lee valores JSON', async () => {
    await writeCache('clients', [{ id: 'c1', nombre: 'Ana' }]);
    expect(await readCache('clients')).toEqual([{ id: 'c1', nombre: 'Ana' }]);
    expect(await readCache('otra')).toBeNull();
  });

  it('clearCache borra solo las copias de la app', async () => {
    await writeCache('clients', [1]);
    mockStore.set('otra-cosa', 'x');
    await clearCache();
    expect(await readCache('clients')).toBeNull();
    expect(mockStore.get('otra-cosa')).toBe('x');
  });

  it('bindCacheToUser conserva la copia de la misma usuaria', async () => {
    await bindCacheToUser('u1');
    await writeCache('clients', [1]);
    await bindCacheToUser('u1');
    expect(await readCache('clients')).toEqual([1]);
  });

  it('bindCacheToUser borra la copia si entra otra usuaria o se cierra la sesión', async () => {
    await bindCacheToUser('u1');
    await writeCache('clients', [1]);
    await bindCacheToUser('u2');
    expect(await readCache('clients')).toBeNull();

    await writeCache('clients', [2]);
    await bindCacheToUser(null);
    expect(await readCache('clients')).toBeNull();
  });

  it('un valor guardado con formato roto se ignora', async () => {
    mockStore.set('cache:v1:clients', '{no es json');
    expect(await readCache('clients')).toBeNull();
  });
});
