import { renderHook, waitFor } from '@testing-library/react-native';

import type { Product } from '../domain/product';
import type { ProductRepository } from '../domain/productRepository';
import { useProduct, useProductActions, useProductImageUrls, useProductList } from './useProducts';

// Evita cargar el cliente real de Supabase (exige variables de entorno) en los tests.
jest.mock('../data/supabaseProductRepository', () => ({ supabaseProductRepository: {} }));

const crema: Product = {
  id: '1',
  nombre: 'Crema',
  codigo: null,
  costoCentavos: 350000,
  precioCentavos: 600000,
  stock: 10,
  stockMinimo: 3,
  imagenPath: null,
  createdAt: '',
  updatedAt: '',
};

function fakeRepo(overrides: Partial<ProductRepository> = {}): ProductRepository {
  return {
    list: jest.fn().mockResolvedValue({ ok: true, data: [crema] }),
    get: jest.fn().mockResolvedValue({ ok: true, data: crema }),
    create: jest.fn().mockResolvedValue({ ok: true, data: crema }),
    update: jest.fn().mockResolvedValue({ ok: true, data: crema }),
    remove: jest.fn().mockResolvedValue({ ok: true, data: null }),
    uploadImage: jest.fn().mockResolvedValue({ ok: true, data: 'u1/nueva.jpg' }),
    removeImage: jest.fn().mockResolvedValue({ ok: true, data: null }),
    signedImageUrls: jest.fn().mockResolvedValue({ ok: true, data: { 'u1/a.jpg': 'https://x/a' } }),
    ...overrides,
  };
}

const form = {
  nombre: ' Crema ',
  codigo: '',
  costoCentavos: '3.500',
  precioCentavos: '6000',
  stock: '10',
  stockMinimo: '3',
};

describe('useProductList', () => {
  it('pasa a listo con los datos', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useProductList(repo));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state).toEqual({ status: 'ready', data: [crema] });
  });

  it('muestra el error del repositorio', async () => {
    const repo = fakeRepo({
      list: jest.fn().mockResolvedValue({ ok: false, message: 'sin señal' }),
    });
    const { result } = await renderHook(() => useProductList(repo));
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'error', message: 'sin señal' }),
    );
  });
});

describe('useProduct', () => {
  it('devuelve null sin consultar si no hay id (alta nueva)', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useProduct(undefined, repo));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', data: null }));
    expect(repo.get).not.toHaveBeenCalled();
  });
});

describe('useProductActions', () => {
  it('valida y crea con importes en centavos y sin foto', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useProductActions(repo));
    expect((await result.current.save(null, form)).ok).toBe(true);
    expect(repo.create).toHaveBeenCalledWith({
      nombre: 'Crema',
      codigo: null,
      costoCentavos: 350000,
      precioCentavos: 600000,
      stock: 10,
      stockMinimo: 3,
      imagenPath: null,
    });
  });

  it('actualiza cuando hay id', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useProductActions(repo));
    await result.current.save('1', form);
    expect(repo.update).toHaveBeenCalledWith('1', expect.objectContaining({ nombre: 'Crema' }));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('no llama al repositorio con datos inválidos y señala el campo', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useProductActions(repo));
    const saved = await result.current.save(null, { ...form, stock: '-3' });
    expect(saved).toMatchObject({ ok: false, field: 'stock' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('propaga el error del repositorio', async () => {
    const repo = fakeRepo({
      create: jest
        .fn()
        .mockResolvedValue({ ok: false, message: 'Ya tenés un producto con ese código.' }),
    });
    const { result } = await renderHook(() => useProductActions(repo));
    expect(await result.current.save(null, form)).toEqual({
      ok: false,
      message: 'Ya tenés un producto con ese código.',
    });
  });
});

describe('useProductActions con foto', () => {
  it('sube la foto nueva y guarda la ruta en el producto', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useProductActions(repo));
    const saved = await result.current.save(null, form, {
      previousPath: null,
      change: { type: 'replace', localUri: 'file:///foto.jpg' },
    });
    expect(saved.ok).toBe(true);
    expect(repo.uploadImage).toHaveBeenCalledWith('file:///foto.jpg');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ imagenPath: 'u1/nueva.jpg' }),
    );
    expect(repo.removeImage).not.toHaveBeenCalled();
  });

  it('al reemplazar, borra la foto anterior después de guardar', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useProductActions(repo));
    await result.current.save('1', form, {
      previousPath: 'u1/vieja.jpg',
      change: { type: 'replace', localUri: 'file:///foto.jpg' },
    });
    expect(repo.update).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ imagenPath: 'u1/nueva.jpg' }),
    );
    expect(repo.removeImage).toHaveBeenCalledWith('u1/vieja.jpg');
  });

  it('al quitar la foto, guarda null y borra el archivo', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useProductActions(repo));
    await result.current.save('1', form, {
      previousPath: 'u1/vieja.jpg',
      change: { type: 'remove' },
    });
    expect(repo.update).toHaveBeenCalledWith('1', expect.objectContaining({ imagenPath: null }));
    expect(repo.removeImage).toHaveBeenCalledWith('u1/vieja.jpg');
  });

  it('si no se toca la foto, conserva la ruta y no borra nada', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useProductActions(repo));
    await result.current.save('1', form, {
      previousPath: 'u1/vieja.jpg',
      change: { type: 'keep' },
    });
    expect(repo.update).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ imagenPath: 'u1/vieja.jpg' }),
    );
    expect(repo.uploadImage).not.toHaveBeenCalled();
    expect(repo.removeImage).not.toHaveBeenCalled();
  });

  it('si falla la subida no guarda el producto', async () => {
    const repo = fakeRepo({
      uploadImage: jest.fn().mockResolvedValue({ ok: false, message: 'sin señal' }),
    });
    const { result } = await renderHook(() => useProductActions(repo));
    const saved = await result.current.save(null, form, {
      previousPath: null,
      change: { type: 'replace', localUri: 'file:///foto.jpg' },
    });
    expect(saved).toEqual({ ok: false, message: 'sin señal' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('si falla el guardado, borra la foto recién subida y conserva la anterior', async () => {
    const repo = fakeRepo({
      update: jest.fn().mockResolvedValue({ ok: false, message: 'fallo' }),
    });
    const { result } = await renderHook(() => useProductActions(repo));
    const saved = await result.current.save('1', form, {
      previousPath: 'u1/vieja.jpg',
      change: { type: 'replace', localUri: 'file:///foto.jpg' },
    });
    expect(saved).toEqual({ ok: false, message: 'fallo' });
    expect(repo.removeImage).toHaveBeenCalledTimes(1);
    expect(repo.removeImage).toHaveBeenCalledWith('u1/nueva.jpg');
  });

  it('no sube nada si el formulario es inválido', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useProductActions(repo));
    const saved = await result.current.save(
      null,
      { ...form, stock: '-1' },
      { previousPath: null, change: { type: 'replace', localUri: 'file:///foto.jpg' } },
    );
    expect(saved.ok).toBe(false);
    expect(repo.uploadImage).not.toHaveBeenCalled();
  });

  it('al eliminar un producto borra también su foto', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useProductActions(repo));
    await result.current.remove({ id: '1', imagenPath: 'u1/vieja.jpg' });
    expect(repo.remove).toHaveBeenCalledWith('1');
    expect(repo.removeImage).toHaveBeenCalledWith('u1/vieja.jpg');
  });

  it('si no se pudo eliminar el producto, conserva la foto', async () => {
    const repo = fakeRepo({ remove: jest.fn().mockResolvedValue({ ok: false, message: 'fallo' }) });
    const { result } = await renderHook(() => useProductActions(repo));
    await result.current.remove({ id: '1', imagenPath: 'u1/vieja.jpg' });
    expect(repo.removeImage).not.toHaveBeenCalled();
  });
});

describe('useProductImageUrls', () => {
  it('pide las URLs firmadas de las rutas indicadas', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useProductImageUrls(['u1/a.jpg'], repo));
    await waitFor(() => expect(result.current).toEqual({ 'u1/a.jpg': 'https://x/a' }));
  });

  it('sin rutas no consulta nada', async () => {
    const repo = fakeRepo();
    const { result } = await renderHook(() => useProductImageUrls([], repo));
    expect(result.current).toEqual({});
    expect(repo.signedImageUrls).not.toHaveBeenCalled();
  });
});
