import { buildGoalInput, goalProgressPct, monthLabel, monthStart } from './goal';

describe('monthStart y monthLabel', () => {
  it('lleva una fecha al primer día de su mes', () => {
    expect(monthStart('2026-11-17')).toBe('2026-11-01');
    expect(monthStart('2027-01-31')).toBe('2027-01-01');
  });
  it('escribe el mes en español', () => {
    expect(monthLabel('2026-11-01')).toBe('noviembre de 2026');
    expect(monthLabel('2027-03-01')).toBe('marzo de 2027');
  });
});

describe('buildGoalInput', () => {
  it('convierte los importes a centavos', () => {
    expect(buildGoalInput({ ventas: '500.000', ganancia: '150.000,50' })).toEqual({
      ok: true,
      input: { ventasCentavos: 50000000, gananciaCentavos: 15000050 },
    });
  });
  it('la ganancia es opcional', () => {
    expect(buildGoalInput({ ventas: '500000', ganancia: '  ' })).toEqual({
      ok: true,
      input: { ventasCentavos: 50000000, gananciaCentavos: null },
    });
  });
  it('exige una meta de ventas válida y positiva', () => {
    for (const ventas of ['', 'abc', '0']) {
      expect(buildGoalInput({ ventas, ganancia: '' })).toMatchObject({
        ok: false,
        field: 'ventas',
      });
    }
  });
  it('rechaza una ganancia ilegible o cero', () => {
    for (const ganancia of ['mucha', '0']) {
      expect(buildGoalInput({ ventas: '1000', ganancia })).toMatchObject({
        ok: false,
        field: 'ganancia',
      });
    }
  });
});

describe('goalProgressPct', () => {
  it('calcula el porcentaje redondeado y permite superar 100', () => {
    expect(goalProgressPct(34000000, 50000000)).toBe(68);
    expect(goalProgressPct(60000000, 50000000)).toBe(120);
    expect(goalProgressPct(0, 50000000)).toBe(0);
  });
  it('devuelve null sin meta', () => {
    expect(goalProgressPct(100, null)).toBeNull();
    expect(goalProgressPct(100, 0)).toBeNull();
  });
  it('no baja de 0 si lo vendido es negativo', () => {
    expect(goalProgressPct(-500, 1000)).toBe(0);
  });
});
