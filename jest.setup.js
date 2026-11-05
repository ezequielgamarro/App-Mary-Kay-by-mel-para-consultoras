// Almacenamiento local simulado en memoria: en las pruebas no hay módulo nativo de SQLite.
const mockMemory = new Map();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: async (key) => mockMemory.get(key) ?? null,
    setItem: async (key, value) => {
      mockMemory.set(key, value);
    },
    removeItem: async (key) => mockMemory.delete(key),
    getAllKeys: async () => [...mockMemory.keys()],
  },
}));

// Cada prueba empieza sin copias locales, igual que un teléfono recién instalado.
beforeEach(async () => {
  mockMemory.clear();
});
