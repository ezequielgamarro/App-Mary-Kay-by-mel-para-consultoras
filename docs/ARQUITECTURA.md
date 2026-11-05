# Arquitectura

App móvil para consultoras de venta directa. Marca provisoria «Bella Gestión» (ver [Marca](#marca)).

## Stack

- Expo SDK 58, React Native 0.88, Expo Router, TypeScript estricto.
- Supabase (Postgres, Auth, Storage) con RLS en todas las tablas.
- Zod para validar entradas. Jest + Testing Library para tests.
- `expo-sqlite` (almacenamiento clave-valor) para la copia local de lectura.
- Las versiones exactas están en `package.json`; no se copian acá para no desactualizarlas.

## Estructura

```
src/
  app/             # rutas de Expo Router: solo composición, sin lógica
  core/            # transversal: cliente Supabase, errores, config, formatos, i18n
  design-system/   # tokens, tema y componentes base
  features/        # una carpeta por funcionalidad (se crean al construir cada una)
    <feature>/
      domain/        # entidades y reglas puras, sin RN ni Supabase
      data/          # repositorios (interfaz + implementación Supabase) y mappers
      application/   # hooks de casos de uso
      ui/            # pantallas y componentes de la feature
supabase/
  migrations/      # SQL versionado
  tests/           # pruebas SQL de RLS
docs/              # esta documentación
```

Las carpetas `core/` y `features/` se crean con el primer archivo real que las necesite; no se versionan vacías.

## Reglas de dependencias

- Hacia adentro: `features → design-system → core`. Dentro de una feature: `ui → application → data → domain`.
- ESLint vigila las capas entre carpetas (`import/no-restricted-paths` en `eslint.config.js`). Las capas internas de cada feature se suman a esa regla cuando exista la primera feature.
- La UI nunca importa el cliente de Supabase: pasa por un repositorio definido como interfaz en `domain`.
- Imports con alias `@/` (definido en `tsconfig.json`).

## Convenciones

- **Dinero:** enteros en centavos, nunca `float`. Solo ARS por ahora; la moneda es un parámetro.
- **Idioma:** textos en es-AR, centralizados en `core` (no sueltos en los componentes).
- **Errores:** tipados; el mensaje para la usuaria va separado del detalle técnico, que solo va al log.
- **Accesibilidad:** contraste AA (los tests de `colors.test.ts` lo verifican), tamaños táctiles de 44 pt como mínimo.
- **Formato:** Prettier con `endOfLine: lf`. Se verifica solo sobre los archivos que se tocan.

## Datos y seguridad

- Todas las tablas llevan `user_id = auth.uid()`, `created_at`, `updated_at`; RLS activado y probado con SQL (la usuaria A no ve ni toca datos de B).
- Solo la clave pública (publishable) vive en el cliente. Nunca `service_role`. Secretos en variables de entorno y EAS secrets, fuera del repo.
- Red de directoras: `patrocinadora_id` en el perfil (árbol). La directora ve solo métricas agregadas que cada consultora acepta compartir; las clientas nunca se exponen. El mínimo de integrantes es configuración, no un valor fijo en el código.
- Nada se aplica a Supabase sin OK explícito; después de cada migración se corre `get_advisors`.
- Checklist aplicada: [SEGURIDAD.md](./SEGURIDAD.md).

## Copia local (sin conexión)

`useLoad(load, cacheKey)` guarda en el teléfono (`core/data/offlineCache.ts`, sobre `expo-sqlite/kv-store`) lo último que cargó bien. Si una carga falla, muestra esa copia con `stale: true` y la pantalla avisa «Sin conexión». Reglas:

- Es solo lectura: ninguna alta, cambio o baja se guarda sin conexión (devuelven el error de siempre).
- La copia pertenece a una usuaria: `bindCacheToUser` (en `SessionProvider`) la borra al cerrar sesión o si entra otra persona.
- Cualquier falla del almacenamiento se ignora; sin copia, la app se comporta como antes.
- La clave es estable por recurso (`clients`, `sale:<id>`, etc.); solo se guardan datos ya mapeados a JSON simple.

## Marca

«Bella Gestión» es un nombre de trabajo (2026-10-30): no se verificó su disponibilidad legal. No se usa el nombre «Mary Kay», su logo ni su corona, porque es marca registrada y bloquea publicar en Play Store.

Identidad visual: la salida estándar de la categoría, Material 3 con un rosa propio (`#D6006E`, texto blanco con contraste AA) y la tipografía del sistema Android (Roboto). Los colores viven en `src/design-system/tokens/colors.ts` como roles de Material (claro y oscuro) y los tests de `colors.test.ts` verifican el contraste. El rosa es provisorio y se cambia en ese único archivo. Antes de esto, el proyecto usaba la paleta y tipografías de _im chic by mel_; se reemplazaron por completo.

## Fases

Estado al 2026-11-05: las fases 0 a 6 están construidas; de la 7 hay copia local de lectura, README e identidad visual.

0. Cimientos: tooling, design system, CI, docs, Supabase con `profiles` + Auth + RLS. ✔
1. Clientas, Agenda e Inicio (dashboard). ✔
2. Stock con foto de referencia. ✔ (pendiente: importación Excel/CSV y exportación PDF)
3. Ventas con cuenta corriente, pagos parciales y anulación. ✔ (pendiente: presupuestos, pedidos por encargo y cierre de caja)
4. Pedidos (sugerencia, simulación, historial y recepción) y alertas de stock. ✔
5. Metas y Gastos. ✔
6. Notas y Equipo/Directoras. ✔
7. Offline de lectura, README e ícono. ✔ (pendiente: notificaciones, WhatsApp, biométrico, cola de escritura sin conexión y build de prueba con EAS)

## Configuración local (`.env`)

El cliente de Supabase lee dos variables públicas desde un archivo `.env` en la raíz (ignorado por git):

```
EXPO_PUBLIC_SUPABASE_URL=<URL del proyecto>
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave sb_publishable_...>
```

La clave publishable es pública por diseño: la protección real está en RLS. Nunca poner en el cliente la `service_role` ni claves secretas. Si falta alguna variable, la app falla al arrancar con un mensaje claro (`src/core/config/env.ts`).
