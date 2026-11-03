import {
  inviteMessage,
  memberProgressPct,
  normalizeInviteCode,
  teamSalesTotal,
  type TeamMember,
} from './team';

function member(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 'm1',
    nombre: 'Beti',
    comparte: true,
    ventasMesCentavos: 500000,
    cantidadVentas: 2,
    metaVentasCentavos: 2000000,
    ...overrides,
  };
}

describe('normalizeInviteCode', () => {
  it('acepta minúsculas y espacios', () => {
    expect(normalizeInviteCode('  ab12cd34ef ')).toBe('AB12CD34EF');
    expect(normalizeInviteCode('AB12 CD34 EF')).toBe('AB12CD34EF');
  });
  it('rechaza códigos de largo incorrecto o con símbolos', () => {
    expect(normalizeInviteCode('')).toBeNull();
    expect(normalizeInviteCode('AB12')).toBeNull();
    expect(normalizeInviteCode('AB12CD34EF5')).toBeNull();
    expect(normalizeInviteCode('AB12CD34E-')).toBeNull();
  });
});

describe('teamSalesTotal', () => {
  it('suma solo a quienes comparten', () => {
    expect(
      teamSalesTotal([
        member(),
        member({ id: 'm2', ventasMesCentavos: 250000 }),
        member({ id: 'm3', comparte: false, ventasMesCentavos: null }),
      ]),
    ).toBe(750000);
    expect(teamSalesTotal([])).toBe(0);
  });
});

describe('memberProgressPct', () => {
  it('calcula el avance hacia la meta', () => {
    expect(memberProgressPct(member())).toBe(25);
  });
  it('es null si no comparte o no tiene meta', () => {
    expect(memberProgressPct(member({ comparte: false, ventasMesCentavos: null }))).toBeNull();
    expect(memberProgressPct(member({ metaVentasCentavos: null }))).toBeNull();
  });
});

describe('inviteMessage', () => {
  it('incluye el código', () => {
    expect(inviteMessage('AB12CD34EF')).toContain('AB12CD34EF');
  });
});
