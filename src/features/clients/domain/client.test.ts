import type { Client } from './client';
import {
  birthdayFromDayMonth,
  birthdayToDayMonth,
  clientFormSchema,
  filterClients,
  whatsappUrl,
} from './client';

describe('birthdayFromDayMonth', () => {
  it('convierte día y mes a fecha ISO con año fijo', () => {
    expect(birthdayFromDayMonth('15/3')).toBe('2000-03-15');
    expect(birthdayFromDayMonth(' 05 / 12 ')).toBe('2000-12-05');
  });
  it('acepta el 29/02', () => {
    expect(birthdayFromDayMonth('29/02')).toBe('2000-02-29');
  });
  it('rechaza fechas que no existen o texto suelto', () => {
    expect(birthdayFromDayMonth('31/04')).toBeNull();
    expect(birthdayFromDayMonth('32/01')).toBeNull();
    expect(birthdayFromDayMonth('15/13')).toBeNull();
    expect(birthdayFromDayMonth('marzo')).toBeNull();
  });
  it('se muestra de vuelta como DD/MM', () => {
    expect(birthdayToDayMonth('2000-03-15')).toBe('15/03');
    expect(birthdayToDayMonth(null)).toBe('');
  });
});

describe('clientFormSchema', () => {
  const base = { nombre: ' Marta ', telefono: '', cumpleanos: '', notas: '' };
  it('recorta el nombre y deja vacíos como null', () => {
    expect(clientFormSchema.parse(base)).toEqual({
      nombre: 'Marta',
      telefono: null,
      cumpleanos: null,
      notas: null,
    });
  });
  it('convierte el cumpleaños', () => {
    expect(clientFormSchema.parse({ ...base, cumpleanos: '15/03' }).cumpleanos).toBe('2000-03-15');
  });
  it('rechaza nombre vacío, cumpleaños inválido y textos largos', () => {
    expect(clientFormSchema.safeParse({ ...base, nombre: '  ' }).success).toBe(false);
    expect(clientFormSchema.safeParse({ ...base, cumpleanos: '99/99' }).success).toBe(false);
    expect(clientFormSchema.safeParse({ ...base, telefono: '1'.repeat(31) }).success).toBe(false);
    expect(clientFormSchema.safeParse({ ...base, notas: 'x'.repeat(2001) }).success).toBe(false);
    expect(clientFormSchema.safeParse({ ...base, nombre: 'a'.repeat(121) }).success).toBe(false);
  });
});

describe('whatsappUrl', () => {
  it('normaliza formatos argentinos comunes', () => {
    const esperado = 'https://wa.me/5491155550000';
    expect(whatsappUrl('11 5555-0000')).toBe(esperado);
    expect(whatsappUrl('011 5555-0000')).toBe(esperado);
    expect(whatsappUrl('+54 9 11 5555-0000')).toBe(esperado);
    expect(whatsappUrl('+54 11 5555-0000')).toBe(esperado);
  });
  it('agrega el mensaje codificado', () => {
    expect(whatsappUrl('1155550000', 'Hola María')).toBe(
      'https://wa.me/5491155550000?text=Hola%20Mar%C3%ADa',
    );
  });
  it('devuelve null si no se puede normalizar con seguridad', () => {
    expect(whatsappUrl(null)).toBeNull();
    expect(whatsappUrl('')).toBeNull();
    expect(whatsappUrl('5555-0000')).toBeNull();
    expect(whatsappUrl('011 15 5555-0000')).toBeNull();
  });
});

describe('filterClients', () => {
  const make = (nombre: string, telefono: string | null): Client => ({
    id: nombre,
    nombre,
    telefono,
    cumpleanos: null,
    notas: null,
    createdAt: '',
    updatedAt: '',
  });
  const all = [make('María Gómez', '1155550000'), make('Lucía Paredes', null)];
  it('ignora tildes y mayúsculas', () => {
    expect(filterClients(all, 'maria').map((c) => c.nombre)).toEqual(['María Gómez']);
    expect(filterClients(all, 'LUCIA')).toHaveLength(1);
  });
  it('busca también por teléfono y devuelve todo con búsqueda vacía', () => {
    expect(filterClients(all, '5555')).toHaveLength(1);
    expect(filterClients(all, '  ')).toHaveLength(2);
  });
});
