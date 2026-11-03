import { GENERIC_ERROR, teamErrorMessage } from './teamErrors';
import { toMyTeam, toTeamMember } from './teamMapper';

describe('teamMapper', () => {
  it('convierte my_team()', () => {
    expect(
      toMyTeam({
        codigo: 'AB12CD34EF',
        patrocinadora_nombre: 'Ana',
        comparte: true,
        integrantes: 3,
      }),
    ).toEqual({ codigo: 'AB12CD34EF', patrocinadoraNombre: 'Ana', comparte: true, integrantes: 3 });
  });

  it('convierte team_summary() y conserva los null de quien no comparte', () => {
    expect(
      toTeamMember({
        member_id: 'm1',
        nombre: 'Cami',
        comparte: false,
        ventas_mes_centavos: null,
        cantidad_ventas: null,
        meta_ventas_centavos: null,
      }),
    ).toEqual({
      id: 'm1',
      nombre: 'Cami',
      comparte: false,
      ventasMesCentavos: null,
      cantidadVentas: null,
      metaVentasCentavos: null,
    });
  });

  it('pone un nombre de reemplazo si el perfil no tiene nombre', () => {
    expect(
      toTeamMember({
        member_id: 'm1',
        nombre: '  ',
        comparte: true,
        ventas_mes_centavos: 0,
        cantidad_ventas: 0,
        meta_ventas_centavos: null,
      }).nombre,
    ).toBe('Sin nombre');
  });
});

describe('teamErrorMessage', () => {
  it('muestra el texto de las reglas de equipo', () => {
    expect(teamErrorMessage({ code: 'BT001', message: 'No encontramos ese código.' })).toBe(
      'No encontramos ese código.',
    );
    expect(
      teamErrorMessage({ code: 'BT006', message: 'Esa persona no es parte de tu equipo.' }),
    ).toBe('Esa persona no es parte de tu equipo.');
  });
  it('oculta los errores técnicos y los códigos desconocidos', () => {
    expect(teamErrorMessage({ code: '42501', message: 'permission denied' })).toBe(GENERIC_ERROR);
    expect(teamErrorMessage({ code: 'BT009', message: 'raro' })).toBe(GENERIC_ERROR);
    expect(teamErrorMessage({})).toBe(GENERIC_ERROR);
    expect(teamErrorMessage({ code: 'BT001', message: ' ' })).toBe(GENERIC_ERROR);
  });
});
