import { addDays } from '@/core/date/dates';
import { formatArs } from '@/core/money/formatArs';
import type { Client } from '@/features/clients/domain/client';
import type { Sale } from '@/features/sales/domain/sale';

import type { Task } from './task';

export type AgendaKind = 'cobro' | 'tarea' | 'cumple';

export type AgendaItem = {
  /** Único dentro de la agenda (mezcla ids de tareas, ventas y clientas). */
  key: string;
  kind: AgendaKind;
  fecha: string;
  titulo: string;
  detalle: string;
  /** Id del recurso al que lleva: tarea, venta o clienta según `kind`. */
  refId: string;
};

export type AgendaSection = {
  key: 'atrasado' | 'hoy' | 'manana' | 'proximos';
  title: string;
  items: AgendaItem[];
};

/** Días hacia adelante que muestra la agenda. */
export const AGENDA_WINDOW_DAYS = 14;

const KIND_ORDER: Record<AgendaKind, number> = { cobro: 0, tarea: 1, cumple: 2 };

/** Próxima fecha (desde hoy inclusive) en que cae un cumpleaños guardado como 2000-MM-DD. */
export function nextBirthday(cumpleanos: string, today: string): string | null {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(cumpleanos);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);

  for (let year = Number(today.slice(0, 4)); year <= Number(today.slice(0, 4)) + 1; year++) {
    const probe = new Date(Date.UTC(year, month - 1, day));
    // El 29/02 en un año no bisiesto se festeja el 28/02.
    const real = probe.getUTCMonth() === month - 1 ? day : 28;
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(real).padStart(2, '0')}`;
    if (iso >= today) return iso;
  }
  return null;
}

export type AgendaSources = { tasks: Task[]; sales: Sale[]; clients: Client[] };

/** Junta tareas pendientes, cobros por vencer y cumpleaños de los próximos días. */
export function buildAgenda({ tasks, sales, clients }: AgendaSources, today: string): AgendaItem[] {
  const limit = addDays(today, AGENDA_WINDOW_DAYS);
  const items: AgendaItem[] = [];

  for (const task of tasks) {
    if (task.hecha || task.fecha > limit) continue;
    items.push({
      key: `tarea:${task.id}`,
      kind: 'tarea',
      fecha: task.fecha,
      titulo: task.titulo,
      detalle: 'Tarea',
      refId: task.id,
    });
  }

  for (const sale of sales) {
    if (sale.estado !== 'activa' || sale.saldoCentavos <= 0) continue;
    if (sale.venceEl === null || sale.venceEl > limit) continue;
    items.push({
      key: `cobro:${sale.id}`,
      kind: 'cobro',
      fecha: sale.venceEl,
      titulo: `Cobrar a ${sale.clientName ?? 'la clienta'}`,
      detalle: `Saldo ${formatArs(sale.saldoCentavos)}`,
      refId: sale.id,
    });
  }

  for (const client of clients) {
    if (client.cumpleanos === null) continue;
    const next = nextBirthday(client.cumpleanos, today);
    if (next === null || next > limit) continue;
    items.push({
      key: `cumple:${client.id}`,
      kind: 'cumple',
      fecha: next,
      titulo: `Cumpleaños de ${client.nombre}`,
      detalle: 'Mandale un saludo',
      refId: client.id,
    });
  }

  return items.sort((a, b) =>
    a.fecha !== b.fecha
      ? a.fecha < b.fecha
        ? -1
        : 1
      : KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.titulo.localeCompare(b.titulo, 'es'),
  );
}

/** Agrupa en Atrasado, Hoy, Mañana y Próximos días; omite los grupos vacíos. */
export function groupAgenda(items: AgendaItem[], today: string): AgendaSection[] {
  const tomorrow = addDays(today, 1);
  const sections: AgendaSection[] = [
    { key: 'atrasado', title: 'Atrasado', items: items.filter((i) => i.fecha < today) },
    { key: 'hoy', title: 'Hoy', items: items.filter((i) => i.fecha === today) },
    { key: 'manana', title: 'Mañana', items: items.filter((i) => i.fecha === tomorrow) },
    { key: 'proximos', title: 'Próximos días', items: items.filter((i) => i.fecha > tomorrow) },
  ];
  return sections.filter((section) => section.items.length > 0);
}
