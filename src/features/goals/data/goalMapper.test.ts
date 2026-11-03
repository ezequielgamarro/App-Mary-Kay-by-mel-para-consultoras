import { toGoal, toWritableRow } from './goalMapper';

describe('goalMapper', () => {
  it('convierte la fila de la base', () => {
    expect(
      toGoal({ id: 'g1', mes: '2026-11-01', ventas_centavos: 50000000, ganancia_centavos: null }),
    ).toEqual({ id: 'g1', mes: '2026-11-01', ventasCentavos: 50000000, gananciaCentavos: null });
  });

  it('arma la fila a guardar solo con columnas escribibles', () => {
    expect(toWritableRow('2026-11-01', { ventasCentavos: 100, gananciaCentavos: 40 })).toEqual({
      mes: '2026-11-01',
      ventas_centavos: 100,
      ganancia_centavos: 40,
    });
  });
});
