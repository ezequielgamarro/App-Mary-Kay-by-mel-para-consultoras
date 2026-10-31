---
name: Bella Gestión
description: Gestión de negocio para consultoras de belleza en Android; Material 3 prolijo con un rosa propio.
colors:
  primary: '#D6006E'
  on-primary: '#FFFFFF'
  primary-container: '#FFD9EA'
  on-primary-container: '#3A0A24'
  background: '#FFF8FA'
  surface: '#FFFFFF'
  surface-variant: '#FBE9F1'
  outline: '#85707A'
  outline-variant: '#E6D3DB'
  on-surface: '#231A1E'
  on-surface-variant: '#5B4651'
  error: '#B3261E'
  success: '#1B6B3A'
  primary-dark: '#FFB0D2'
  on-primary-dark: '#5E0036'
  primary-container-dark: '#8A0050'
  on-primary-container-dark: '#FFD9EA'
  background-dark: '#1D1317'
  surface-dark: '#251A1F'
  surface-variant-dark: '#3A2A32'
  outline-dark: '#9E8891'
  outline-variant-dark: '#4A3A42'
  on-surface-dark: '#F1DFE5'
  on-surface-variant-dark: '#D6C0C9'
  error-dark: '#FFB4AB'
  success-dark: '#7DD99A'
typography:
  display:
    fontFamily: 'System (Roboto en Android)'
    fontSize: '36px'
    fontWeight: 400
    lineHeight: '44px'
  headline:
    fontFamily: 'System (Roboto en Android)'
    fontSize: '24px'
    fontWeight: 500
    lineHeight: '32px'
  title:
    fontFamily: 'System (Roboto en Android)'
    fontSize: '18px'
    fontWeight: 500
    lineHeight: '24px'
  body:
    fontFamily: 'System (Roboto en Android)'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: '24px'
  body-strong:
    fontFamily: 'System (Roboto en Android)'
    fontSize: '16px'
    fontWeight: 500
    lineHeight: '24px'
  label:
    fontFamily: 'System (Roboto en Android)'
    fontSize: '12px'
    fontWeight: 500
    lineHeight: '16px'
    letterSpacing: '0.5px'
  numeric:
    fontFamily: 'System (Roboto en Android)'
    fontSize: '36px'
    fontWeight: 500
    lineHeight: '44px'
    fontFeature: 'tabular-nums'
rounded:
  sm: '8px'
  md: '16px'
  lg: '24px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '32px'
components:
  button-filled:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.body-strong}'
    rounded: '{rounded.pill}'
    padding: '0 24px'
    height: '48px'
  button-tonal:
    backgroundColor: '{colors.primary-container}'
    textColor: '{colors.on-primary-container}'
    typography: '{typography.body-strong}'
    rounded: '{rounded.pill}'
    padding: '0 24px'
    height: '48px'
  button-outlined:
    backgroundColor: 'transparent'
    textColor: '{colors.primary}'
    typography: '{typography.body-strong}'
    rounded: '{rounded.pill}'
    padding: '0 24px'
    height: '48px'
  button-text:
    backgroundColor: 'transparent'
    textColor: '{colors.primary}'
    typography: '{typography.body-strong}'
    rounded: '{rounded.pill}'
    padding: '0 24px'
    height: '48px'
  card-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.md}'
    padding: '16px'
  card-tonal:
    backgroundColor: '{colors.surface-variant}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.md}'
    padding: '16px'
  card-surface:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.md}'
    padding: '16px'
  fab-extended:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.body-strong}'
    rounded: '{rounded.md}'
    padding: '0 16px'
    height: '56px'
  list-item:
    textColor: '{colors.on-surface}'
    typography: '{typography.body}'
    padding: '8px 0'
    height: '64px'
  list-item-avatar:
    backgroundColor: '{colors.primary-container}'
    textColor: '{colors.on-primary-container}'
    rounded: '{rounded.pill}'
    size: '40px'
  top-bar:
    backgroundColor: '{colors.background}'
    textColor: '{colors.on-surface}'
    padding: '0 16px'
    height: '64px'
  top-bar-elevated:
    backgroundColor: '{colors.surface-variant}'
  progress-track:
    height: '4px'
    rounded: '2px'
---

# Design System: Bella Gestión

> Estado de verificación: este sistema se derivó del código y de capturas de la vista previa web. No se verificó en un dispositivo ni en un emulador Android. El comportamiento real (ripple, elevación nativa, escala de fuente del sistema, Roboto) está sin comprobar.

## Overview

**Creative North Star: "La app estándar, bien hecha"**

Material 3 ejecutado con prolijidad total y una sola decisión propia: un rosa intenso. No hay disfraz de libreta, cartel ni filete; la usuaria eligió la salida estándar de la categoría y el sistema la respeta. La identidad vive en un único color y en la disciplina del resto: espaciado en pasos de 4 y 8, tipografía del sistema, formas redondeadas y tonos en lugar de sombras.

El rosa #D6006E es provisorio. Lo pidió la usuaria como parecido a la familia de Mary Kay, sin copiar nombre, logo ni corona. Se cambia en un solo lugar (`palette.pink600` en `src/design-system/tokens/colors.ts`). La marca propia es "Bella Gestión", nombre de trabajo sin verificar legalmente.

La pantalla es densa en datos y calma en forma: cifras grandes con números tabulares, texto en tinta ciruela, rojo y verde reservados a estados.

**Key Characteristics:**

- Un solo acento (rosa), con tema claro y oscuro de igual jerarquía.
- Tipografía del sistema Android, sin fuentes propias; respeta el tamaño de letra de la usuaria.
- Profundidad por tono (superficies teñidas), no por sombra, salvo el botón flotante.
- Objetivos táctiles de 48 dp o más.
- Íconos de Material (`MaterialIcons`), sin decorativos.

## Colors

Rosa intenso sobre fondo cálido casi blanco (claro) o ciruela muy oscuro (oscuro); neutros teñidos hacia el rosa, nunca grises puros.

### Primary

- **Rosa Bella** (#D6006E): botón relleno, tarjeta principal, FAB, texto de acciones. Texto blanco encima (AA). Provisorio.
- **Rosa Pastel de Contenedor** (#FFD9EA): avatares, botón tonal. Texto #3A0A24 encima.
- **Rosa Pastel Oscuro** (#FFB0D2): primario en tema oscuro; texto #5E0036 encima. Contenedor oscuro #8A0050.

### Neutral

- **Blanco Rosado** (#FFF8FA): fondo de pantalla claro.
- **Rosa Neblina** (#FBE9F1): tarjetas tonales, barra superior elevada.
- **Blanco** (#FFFFFF): superficie neutra con borde de contorno suave (#E6D3DB).
- **Tinta Ciruela** (#231A1E): texto principal; secundario #5B4651; contorno #85707A.
- **Ciruela Noche** (#1D1317): fondo oscuro; superficie #251A1F; variante #3A2A32; texto #F1DFE5.

### Semántico

- **Rojo Estado** (#B3261E, oscuro #FFB4AB): solo vencido o error.
- **Verde Estado** (#1B6B3A, oscuro #7DD99A): solo éxito; definido en tokens y sin uso visible aún en la pantalla de inicio.

### Named Rules

**The One Pink Rule.** El rosa es el único acento. Rojo y verde solo comunican estado, nunca decoran.
**The Tinted Neutral Rule.** Fondos, superficies y textos llevan matiz rosa; no se usa gris neutro ni negro puro.
**The Role Rule.** El código usa roles (`primary`, `onSurface`, `surfaceVariant`), no hex sueltos; los colores se leen de `useTheme()`.

## Typography

**Fuente:** del sistema (Roboto en Android), sin fuentes propias ni carga.

**Character:** escala de Material, neutra y legible; el peso 500 marca jerarquía y el 400 el cuerpo.

### Hierarchy

- **Display** (400, 36/44): reservado; sin uso en la pantalla actual.
- **Numeric** (500, 36/44, números tabulares): cifra principal de la tarjeta destacada.
- **Headline** (500, 24/32): título de la barra superior, que lo reduce a 22/28.
- **Title** (500, 18/24): títulos de sección y cifras secundarias.
- **Body** (400, 16/24): texto corrido y nombres en filas.
- **Body strong** (500, 16/24): etiquetas de botones, FAB, iniciales y saldos.
- **Label** (500, 12/16, tracking 0.5): rótulos de tarjetas y línea de apoyo de filas.

### Named Rules

**The Tabular Money Rule.** Todo importe usa números tabulares y una línea; las cifras grandes se reducen con `adjustsFontSizeToFit` antes de partirse.
**The System Type Rule.** No se agregan fuentes; el tamaño sigue la configuración del sistema.

## Layout

Una columna a ancho completo con margen de 16 dp y separación vertical de 16 dp. La escala de espaciado es 4 / 8 / 16 / 24 / 32. Orden de la pantalla: barra superior de 64 dp, tarjeta principal, dos tarjetas tonales en fila (mitad y mitad), encabezado de sección con acción de texto, filas de lista. El contenido deja 120 dp inferiores para que el FAB no tape filas. El FAB flota abajo a la derecha a 16 dp de los bordes. Alto mínimo táctil: 48 dp; filas de 64 dp. Solo se construyó una pantalla en retrato; no hay breakpoints ni diseño para tablet o apaisado.

## Elevation & Depth

Tonal. Las superficies se distinguen por color (fondo, rosa neblina, blanco con borde de 1 dp) y no por sombra. La barra superior pasa de fondo a rosa neblina al desplazar. La única elevación real es el FAB (`elevation: 6`, sombra nativa de Android).

### Named Rules

**The Tone Not Shadow Rule.** La profundidad se expresa cambiando de superficie; la sombra se reserva para la única acción flotante.

## Shapes

Esquinas generosas y consistentes: 16 dp en tarjetas y FAB, píldora completa en botones, círculo en avatares (40 dp), 2 dp en la barra de progreso (4 dp de alto). Radios disponibles: 8 / 16 / 24 / píldora. El botón outlined usa borde de 1 dp en contorno; los demás llevan borde transparente.

## Components

Estándar de Material 3, implementados en `src/design-system/components/` y exportados desde `@/design-system`.

### Buttons (AppButton)

- **Shape:** píldora (999), alto mínimo 48 dp, relleno horizontal de 24 dp, texto body strong.
- **Filled:** rosa con texto blanco. **Tonal:** contenedor rosa con texto #3A0A24. **Outlined:** transparente, borde de contorno, texto rosa. **Text:** transparente, texto rosa (por ejemplo "Ver todas").
- **States:** ripple de Android teñido del color de texto; presionado 0.9 de opacidad; deshabilitado 0.5.

### Cards (AppCard)

- Esquina 16, relleno 16. Tres tonos: `primary` (cifra destacada), `tonal` (por defecto, rosa neblina), `surface` (blanco con borde de contorno). Sin sombra.

### Extended FAB (AppFab)

- Alto 56, esquina 16, ícono de 24 más etiqueta body strong, fondo primario; una sola acción principal por pantalla ("Registrar venta").

### List item (AppListItem)

- Fila de 64 dp: avatar circular de iniciales, título body y apoyo label a una línea, saldo body strong tabular a la derecha. Rojo en apoyo y saldo solo si está vencido. La etiqueta de accesibilidad une título, apoyo y saldo.

### Progress (AppProgress)

- Línea de 4 dp; pista al 30 % del color de relleno; variante `onPrimary` sobre tarjeta principal. Expone rol y valor de accesibilidad.

### Top bar (AppTopBar)

- 64 dp, título 22/28, fondo `background`, que cambia a `surfaceVariant` al desplazar.

### Text (AppText)

- Único punto de entrada de texto: variante tipográfica más rol de color; no se escribe texto con estilos sueltos.

## Do's and Don'ts

### Do:

- **Do** tomar colores de `useTheme()` por rol y probar siempre claro y oscuro.
- **Do** usar solo los pasos 4 / 8 / 16 / 24 / 32 y los radios 8 / 16 / 24 / píldora.
- **Do** formatear dinero con `formatArs` (`src/core/money/formatArs.ts`) y mostrarlo en números tabulares.
- **Do** marcar datos de muestra como tales mientras no haya datos reales.
- **Do** mantener 48 dp mínimos en todo lo pulsable.

### Don't:

- **Don't** introducir un segundo acento ni usar rojo o verde como decoración.
- **Don't** agregar fuentes propias ni fijar tamaños que ignoren la escala del sistema.
- **Don't** usar gris puro, negro puro ni sombras para crear jerarquía.
- **Don't** copiar nombre, logo ni corona de Mary Kay; el rosa es solo parecido de familia.

## Pendientes y deriva conocida

- Rosa provisorio, pedido por la usuaria; cambiable en `palette.pink600`.
- En tema oscuro la tarjeta principal usa el pastel #FFB0D2 y domina la pantalla (riesgo aceptado en el brief).
- Íconos: solo `MaterialIcons` en el FAB; la elección final de íconos sigue abierta. Barra de navegación inferior: aún no existe (llega en la fase 1).
- No verificado en Android real ni emulador; las capturas fueron de la vista previa web.
