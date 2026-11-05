# Bella Gestión

App móvil (Android primero) para consultoras de venta directa de cosmética en Argentina: ventas con cuenta corriente, stock, clientas, pedidos, gastos, metas, agenda, notas y equipo, todo en pesos y con el inicio pensado para tener «los números claros».

> «Bella Gestión» es un nombre de trabajo. No se verificó su disponibilidad legal y la app no usa el nombre, el logo ni la corona de ninguna marca.

## Qué hace hoy

| Módulo    | Qué resuelve                                                                                                          |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| Inicio    | Vendido del mes, ganancia, gastos y ganancia neta, avance de la meta, por cobrar, valor del stock y clientas deudoras |
| Ventas    | Venta con varios productos, pagos parciales, vencimiento, cobros posteriores y anulación (devuelve el stock)          |
| Clientas  | Ficha, cumpleaños y cuenta corriente                                                                                  |
| Productos | Stock, costo, precio, stock mínimo y foto de referencia                                                               |
| Pedidos   | Sugerencia de reposición según stock y ventas, simulación de costo y ganancia, historial y recepción que suma stock   |
| Gastos    | Gastos por tipo y total del mes                                                                                       |
| Metas     | Meta mensual de ventas y de ganancia                                                                                  |
| Agenda    | Cobros por vencer, cumpleaños y tareas propias                                                                        |
| Notas     | Notas libres con buscador                                                                                             |
| Equipo    | Código de invitación; la directora ve solo los totales que cada integrante acepta compartir                           |

Sin conexión se ven los últimos datos cargados en el teléfono, con un aviso. Las altas y cambios necesitan conexión.

## Stack

Expo SDK 58 · React Native 0.88 · Expo Router · TypeScript estricto · Supabase (Postgres, Auth, Storage, RLS) · Zod · Jest + Testing Library.

## Puesta en marcha

Requisitos: Node 22 y la app **Expo Go** en el teléfono (o un emulador Android).

```bash
npm install
# creá el archivo .env con las dos variables públicas de Supabase (ver abajo)
npm start
```

`npm start` muestra un código QR para abrir la app en Expo Go. Si el teléfono y la computadora están en la misma red Wi‑Fi, `npx expo start --lan` suele ser lo más directo. Las variables y su significado están en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md#configuración-local-env). Nunca se pone en el cliente la clave `service_role`.

## Comandos

| Comando                           | Para qué                               |
| --------------------------------- | -------------------------------------- |
| `npm run typecheck`               | Verificación de tipos (`tsc --noEmit`) |
| `npm run lint`                    | ESLint, incluida la regla de capas     |
| `npm test`                        | Pruebas con Jest                       |
| `npx prettier --check <archivos>` | Formato de los archivos que tocaste    |

El CI (`.github/workflows/ci.yml`) corre tipos, lint y pruebas en cada push, y el formato de los archivos cambiados en cada pull request.

> Los tipos de rutas de Expo Router (`.expo/types/router.d.ts`) se regeneran al iniciar el servidor de desarrollo. Si `tsc` marca rutas nuevas como inexistentes, borrá ese archivo e iniciá `npx expo start` una vez.

## Base de datos

Las migraciones están en `supabase/migrations/` y las pruebas de seguridad (RLS y reglas de negocio) en `supabase/tests/`. Cada prueba corre dentro de una transacción que termina en `ROLLBACK`: no deja datos. Toda tabla tiene RLS y cada consultora ve solo lo suyo. Detalle en [docs/SEGURIDAD.md](docs/SEGURIDAD.md).

## Estructura

```
src/app/            rutas de Expo Router (solo composición)
src/core/           cliente Supabase, fechas, dinero, copia local
src/design-system/  tokens, tema y componentes base (Material 3)
src/features/<x>/   domain · data · application · ui
supabase/           migraciones y pruebas SQL
docs/               arquitectura y seguridad
```

Las reglas de dependencias y las convenciones (dinero en centavos, es-AR, errores sin detalle técnico) están en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Pendiente antes de publicar

- Verificar la disponibilidad legal del nombre y definir el mínimo de integrantes de una directora.
- Probar en más dispositivos Android y generar un build de prueba con EAS.
- Notificaciones, integración con WhatsApp y acceso biométrico (fase 7 del plan).
- Totales del inicio calculados en la base (la API devuelve como máximo 1.000 filas por consulta).
