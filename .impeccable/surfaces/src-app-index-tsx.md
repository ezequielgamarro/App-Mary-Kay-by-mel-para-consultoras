---
version: 1
slug: "src-app-index-tsx"
primary_target: "src/app/index.tsx"
related_targets: []
---

# Surface brief: Inicio (pantalla de arranque)

Modo: Operate. Plataforma: Android (Material 3). Pantalla provisoria que muestra la identidad nueva antes de construir los módulos reales.

Audiencia y tarea: la consultora abre la app para ver cómo va su negocio hoy (ventas del mes, por cobrar, stock) y registrar una venta. Datos de muestra rotulados como tales; no se inventan cifras reales ni clientas reales.

Nombre de trabajo: «Bella Gestión» (provisorio, sin verificar disponibilidad legal).

Riesgo asumido: el rosa #D6006E es el pedido por la usuaria (parecido a la familia de Mary Kay); una variante más oscura la alejaría de la marca pero contradice su pedido. En tema oscuro la tarjeta principal usa el pastel de Material, que domina la pantalla.

Decisiones sin resolver: color exacto de la marca dentro de la familia rosa (provisorio, fácil de cambiar); íconos del sistema; navegación inferior con rutas reales (llega con la fase 1).

## Direction contract

THESIS: la app de gestión estándar de la categoría, ejecutada con prolijidad total y sin rarezas: Material 3 con una identidad rosa propia. Rechaza el disfraz de mundo (libreta, cartel, filete) porque la usuaria eligió la salida estándar.

OWN-WORLD: rosa intenso propio (#D6006E, texto blanco AA) como color principal, tinte rosa claro para contenedores y fondo cálido casi blanco; texto en tinta ciruela oscura; rojo y verde solo como estados. Tipografía del sistema Android (Roboto) con la escala de Material. Barra superior, tarjetas tonales, lista de clientas, FAB y barra de navegación inferior de Material.

STORY: la consultora entiende en un vistazo cuánto vendió, cuánto le deben y qué clientas tienen saldo; cree que la app es profesional y suya (marca propia, no la de la empresa); registra una venta con un toque en el botón flotante.

FIRST VIEWPORT: barra superior de 64 dp con el nombre de la app, que se eleva con tono al desplazar; una tarjeta ancha en el color principal con «Ventas del mes · datos de muestra», la cifra grande y una barra de progreso hacia la meta; debajo dos tarjetas tonales (Por cobrar, Stock); luego «Clientas» con acción «Ver todas» y filas pulsables con avatar, nombre, estado y saldo a la derecha (rojo solo si está vencido); botón flotante extendido con ícono «Registrar venta» abajo a la derecha. Sin barra inferior real hasta la fase 1.

FORM: salida estándar de la categoría (canon), elegida por la usuaria; sin posición en mi lista; seed:c80cde57bb0cd764.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
