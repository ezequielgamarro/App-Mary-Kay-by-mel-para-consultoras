import { goalProgressPct } from '@/features/goals/domain/goal';

/** Mi situación en la red: mi código, mi directora (si tengo) y cuántas integrantes tengo. */
export type MyTeam = {
  codigo: string;
  patrocinadoraNombre: string | null;
  /** Si comparto mis números del mes con mi directora. */
  comparte: boolean;
  integrantes: number;
};

/** Integrante de mi equipo, tal como la ve la directora. Los números son null si no comparte. */
export type TeamMember = {
  id: string;
  nombre: string;
  comparte: boolean;
  ventasMesCentavos: number | null;
  cantidadVentas: number | null;
  metaVentasCentavos: number | null;
};

const INVITE_CODE = /^[A-Z0-9]{10}$/;

/** Limpia lo que escribió la usuaria (espacios, minúsculas) y devuelve el código, o null si no es válido. */
export function normalizeInviteCode(text: string): string | null {
  const code = text.replace(/\s/g, '').toUpperCase();
  return INVITE_CODE.test(code) ? code : null;
}

/** Suma de lo vendido en el mes por quienes comparten. */
export function teamSalesTotal(members: TeamMember[]): number {
  return members.reduce((sum, member) => sum + (member.ventasMesCentavos ?? 0), 0);
}

/** Avance de una integrante hacia su meta, o null si no comparte o no definió meta. */
export function memberProgressPct(member: TeamMember): number | null {
  if (member.ventasMesCentavos === null) return null;
  return goalProgressPct(member.ventasMesCentavos, member.metaVentasCentavos);
}

/** Texto para compartir el código con una futura integrante. */
export function inviteMessage(codigo: string): string {
  return `Sumate a mi equipo en Bella Gestión. Mi código de invitación es: ${codigo}`;
}
