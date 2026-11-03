import { addDays, daysBetween, formatDateAr, parseDateAr, todayIso } from './dates';

describe('todayIso', () => {
  it('usa la fecha de Argentina (UTC-3), no la UTC', () => {
    // 01:30 UTC del 3/11 todavía es 22:30 del 2/11 en Argentina.
    expect(todayIso(new Date('2026-11-03T01:30:00Z'))).toBe('2026-11-02');
    expect(todayIso(new Date('2026-11-03T03:00:00Z'))).toBe('2026-11-03');
  });
});

describe('parseDateAr', () => {
  it('convierte DD/MM/AAAA a ISO', () => {
    expect(parseDateAr('05/11/2026')).toBe('2026-11-05');
    expect(parseDateAr(' 5 / 1 / 2027 ')).toBe('2027-01-05');
  });
  it('rechaza fechas inexistentes o mal escritas', () => {
    expect(parseDateAr('31/02/2026')).toBeNull();
    expect(parseDateAr('29/02/2027')).toBeNull();
    expect(parseDateAr('2026-11-05')).toBeNull();
    expect(parseDateAr('05/11/26')).toBeNull();
    expect(parseDateAr('')).toBeNull();
  });
  it('acepta el 29/02 de un año bisiesto', () => {
    expect(parseDateAr('29/02/2028')).toBe('2028-02-29');
  });
});

describe('formatDateAr', () => {
  it('muestra DD/MM/AAAA y vacío si no hay fecha', () => {
    expect(formatDateAr('2026-11-05')).toBe('05/11/2026');
    expect(formatDateAr(null)).toBe('');
    expect(formatDateAr('basura')).toBe('');
  });
});

describe('addDays y daysBetween', () => {
  it('suma días cruzando mes y año', () => {
    expect(addDays('2026-11-25', 10)).toBe('2026-12-05');
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('cuenta los días entre dos fechas', () => {
    expect(daysBetween('2026-11-02', '2026-11-05')).toBe(3);
    expect(daysBetween('2026-11-05', '2026-11-02')).toBe(-3);
    expect(daysBetween('2026-11-02', '2026-11-02')).toBe(0);
  });
});
