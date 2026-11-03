import { toTask, toWritableRow } from './taskMapper';

describe('taskMapper', () => {
  it('convierte la fila de la base', () => {
    expect(toTask({ id: 't1', titulo: 'Llamar', fecha: '2026-11-10', hecha: false })).toEqual({
      id: 't1',
      titulo: 'Llamar',
      fecha: '2026-11-10',
      hecha: false,
    });
  });

  it('arma la fila a guardar solo con título y fecha', () => {
    expect(toWritableRow({ titulo: 'Llamar', fecha: '2026-11-10' })).toEqual({
      titulo: 'Llamar',
      fecha: '2026-11-10',
    });
  });
});
