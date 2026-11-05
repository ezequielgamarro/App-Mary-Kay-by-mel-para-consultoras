/**
 * Copia local de lo último que se pudo cargar, para seguir viendo los datos sin conexión.
 *
 * Es solo lectura: nada se escribe sin conexión. La copia pertenece a una sola usuaria
 * (`bindCacheToUser`) y se borra al cerrar sesión o si entra otra persona en el mismo teléfono.
 * Cualquier falla del almacenamiento se ignora: sin copia, la app funciona igual.
 */

import kvStore from 'expo-sqlite/kv-store';

const PREFIX = 'cache:v1:';
const OWNER_KEY = 'cache:owner';

type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<unknown>;
  getAllKeys(): Promise<string[]>;
};

function storage(): KeyValueStorage {
  return kvStore as unknown as KeyValueStorage;
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const store = storage();
    const raw = await store.getItem(PREFIX + key);
    return raw == null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    const store = storage();
    await store.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Sin copia local la app funciona igual.
  }
}

/** Borra todas las copias locales (se usa al cerrar sesión). */
export async function clearCache(): Promise<void> {
  try {
    const store = storage();
    const keys = await store.getAllKeys();
    await Promise.all(
      keys.filter((k) => k.startsWith(PREFIX) || k === OWNER_KEY).map((k) => store.removeItem(k)),
    );
  } catch {
    // Nada que hacer: la próxima carga exitosa reescribe las copias.
  }
}

/**
 * Asocia la copia local a la usuaria con sesión. Sin sesión, o si la dueña es otra persona,
 * se borra todo para que nunca se vean datos ajenos.
 */
export async function bindCacheToUser(userId: string | null): Promise<void> {
  try {
    if (userId === null) {
      await clearCache();
      return;
    }
    const store = storage();
    const owner = await store.getItem(OWNER_KEY);
    if (owner === userId) return;
    await clearCache();
    await store.setItem(OWNER_KEY, userId);
  } catch {
    // Ver nota de arriba.
  }
}
