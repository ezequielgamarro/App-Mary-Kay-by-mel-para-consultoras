import { toClient, toWritableRow } from './clientMapper';

describe('clientMapper', () => {
  it('convierte una fila de la base a Client', () => {
    expect(
      toClient({
        id: '1',
        nombre: 'Marta',
        telefono: '11 5555-0000',
        cumpleanos: '2000-03-15',
        notas: null,
        created_at: '2026-10-31T10:00:00Z',
        updated_at: '2026-10-31T11:00:00Z',
      }),
    ).toEqual({
      id: '1',
      nombre: 'Marta',
      telefono: '11 5555-0000',
      cumpleanos: '2000-03-15',
      notas: null,
      createdAt: '2026-10-31T10:00:00Z',
      updatedAt: '2026-10-31T11:00:00Z',
    });
  });

  it('nunca envía user_id ni campos que la consultora no puede escribir', () => {
    const row = toWritableRow({
      nombre: 'Marta',
      telefono: null,
      cumpleanos: null,
      notas: null,
    });
    expect(Object.keys(row).sort()).toEqual(['cumpleanos', 'nombre', 'notas', 'telefono']);
  });
});
