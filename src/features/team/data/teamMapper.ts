import type { MyTeam, TeamMember } from '../domain/team';

/** Fila que devuelve la función `my_team()`. */
export type MyTeamRow = {
  codigo: string;
  patrocinadora_nombre: string | null;
  comparte: boolean;
  integrantes: number;
};

/** Fila que devuelve la función `team_summary()`. */
export type TeamMemberRow = {
  member_id: string;
  nombre: string;
  comparte: boolean;
  ventas_mes_centavos: number | null;
  cantidad_ventas: number | null;
  meta_ventas_centavos: number | null;
};

export function toMyTeam(row: MyTeamRow): MyTeam {
  return {
    codigo: row.codigo,
    patrocinadoraNombre: row.patrocinadora_nombre,
    comparte: row.comparte,
    integrantes: row.integrantes,
  };
}

export function toTeamMember(row: TeamMemberRow): TeamMember {
  return {
    id: row.member_id,
    nombre: row.nombre.trim() === '' ? 'Sin nombre' : row.nombre,
    comparte: row.comparte,
    ventasMesCentavos: row.ventas_mes_centavos,
    cantidadVentas: row.cantidad_ventas,
    metaVentasCentavos: row.meta_ventas_centavos,
  };
}
