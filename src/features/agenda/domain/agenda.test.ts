import type { Client } from '@/features/clients/domain/client';
import type { Sale } from '@/features/sales/domain/sale';

import { AGENDA_WINDOW_DAYS, buildAgenda, groupAgenda, nextBirthday } from './agenda';
import { buildTaskInput, type Task } from './task';

const TODAY = '2026-11-10';

function task(overrides: Partial<Task> = {}): Task {
  return { id: 't1', titulo: 'Llamar a Ana', fecha: TODAY, hecha: false, ...overrides };
}

function sale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 's1',
    clientId: 'c1',
    clientName: 'Marta',
    vendidaEl: '2026-11-01',
    venceEl: '2026-11-12',
    notas: null,
    estado: 'activa',
    totalCentavos: 1000000,
    pagadoCentavos: 400000,
    saldoCentavos: 600000,
    createdAt: '',
    ...overrides,
  };
}

function client(overrides: Partial<Client> = {}): Client {
  return {
    id: 'c1',
    nombre: 'Lucía',
    telefono: null,
    cumpleanos: '2000-11-15',
    notas: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('buildTaskInput', () => {
  it('acepta título y una fecha de hoy o futura', () => {
    expect(buildTaskInput({ titulo: '  Llamar  ', fecha: '10/11/2026' }, TODAY)).toEqual({
      ok: true,
      input: { titulo: 'Llamar', fecha: '2026-11-10' },
    });
  });
  it('rechaza título vacío o largo, fecha mal escrita y fecha pasada', () => {
    expect(buildTaskInput({ titulo: ' ', fecha: '10/11/2026' }, TODAY)).toMatchObject({
      ok: false,
      field: 'titulo',
    });
    expect(buildTaskInput({ titulo: 'x'.repeat(201), fecha: '10/11/2026' }, TODAY)).toMatchObject({
      ok: false,
      field: 'titulo',
    });
    expect(buildTaskInput({ titulo: 'a', fecha: '2026-11-10' }, TODAY)).toMatchObject({
      ok: false,
      field: 'fecha',
    });
    expect(buildTaskInput({ titulo: 'a', fecha: '09/11/2026' }, TODAY)).toMatchObject({
      ok: false,
      field: 'fecha',
      message: 'La fecha ya pasó.',
    });
  });
});

describe('nextBirthday', () => {
  it('devuelve este año si todavía no pasó, o el próximo si ya pasó', () => {
    expect(nextBirthday('2000-11-15', TODAY)).toBe('2026-11-15');
    expect(nextBirthday('2000-11-10', TODAY)).toBe('2026-11-10');
    expect(nextBirthday('2000-11-09', TODAY)).toBe('2027-11-09');
  });
  it('festeja el 29/02 el 28/02 en años no bisiestos', () => {
    expect(nextBirthday('2000-02-29', '2026-12-01')).toBe('2027-02-28');
    expect(nextBirthday('2000-02-29', '2027-12-01')).toBe('2028-02-29');
  });
  it('ignora fechas ilegibles', () => {
    expect(nextBirthday('basura', TODAY)).toBeNull();
  });
});

describe('buildAgenda', () => {
  it('junta tareas, cobros y cumpleaños dentro de la ventana, ordenados por fecha', () => {
    const items = buildAgenda(
      {
        tasks: [task({ fecha: '2026-11-11' })],
        sales: [sale()],
        clients: [client()],
      },
      TODAY,
    );
    expect(items.map((i) => [i.fecha, i.kind])).toEqual([
      ['2026-11-11', 'tarea'],
      ['2026-11-12', 'cobro'],
      ['2026-11-15', 'cumple'],
    ]);
    expect(items[1]).toMatchObject({ titulo: 'Cobrar a Marta', detalle: 'Saldo $ 6.000' });
    expect(items[2].titulo).toBe('Cumpleaños de Lucía');
  });

  it('deja afuera lo hecho, anulado, pagado, sin vencimiento o fuera de la ventana', () => {
    const lejos = '2026-12-01';
    expect(AGENDA_WINDOW_DAYS).toBe(14);
    const items = buildAgenda(
      {
        tasks: [task({ hecha: true }), task({ id: 't2', fecha: lejos })],
        sales: [
          sale({ id: 'a', estado: 'anulada' }),
          sale({ id: 'b', saldoCentavos: 0 }),
          sale({ id: 'c', venceEl: null }),
          sale({ id: 'd', venceEl: lejos }),
        ],
        clients: [client({ cumpleanos: null }), client({ id: 'c2', cumpleanos: '2000-12-25' })],
      },
      TODAY,
    );
    expect(items).toEqual([]);
  });

  it('incluye lo atrasado y pone primero los cobros del mismo día', () => {
    const items = buildAgenda(
      {
        tasks: [task({ fecha: '2026-11-12', titulo: 'Zeta' })],
        sales: [sale({ venceEl: '2026-11-08' }), sale({ id: 's2', venceEl: '2026-11-12' })],
        clients: [],
      },
      TODAY,
    );
    expect(items.map((i) => [i.fecha, i.kind])).toEqual([
      ['2026-11-08', 'cobro'],
      ['2026-11-12', 'cobro'],
      ['2026-11-12', 'tarea'],
    ]);
  });
});

describe('groupAgenda', () => {
  it('agrupa en atrasado, hoy, mañana y próximos, sin grupos vacíos', () => {
    const items = buildAgenda(
      {
        tasks: [
          task({ id: '1', fecha: '2026-11-08' }),
          task({ id: '2', fecha: TODAY }),
          task({ id: '3', fecha: '2026-11-11' }),
          task({ id: '4', fecha: '2026-11-20' }),
        ],
        sales: [],
        clients: [],
      },
      TODAY,
    );
    const sections = groupAgenda(items, TODAY);
    expect(sections.map((s) => [s.key, s.items.length])).toEqual([
      ['atrasado', 1],
      ['hoy', 1],
      ['manana', 1],
      ['proximos', 1],
    ]);
    expect(groupAgenda([], TODAY)).toEqual([]);
  });
});
