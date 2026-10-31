# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Consultoras independientes de venta directa de cosmética (hoy Mary Kay) en Argentina. Gestionan su negocio solas, desde el celular, entre clientas, entregas y cobros, muchas veces con mala señal. Una segunda audiencia, confirmada para v1: las directoras, que tienen a cargo una red de consultoras (árbol de varios niveles; una consultora puede pasar a directora de su propio grupo).

## Product Purpose

App móvil que reemplaza a una app existente de referencia («Consultora de Éxito») y la supera en diseño y funciones. Le da a la consultora «los números de su negocio claros y ordenados» para saber dónde está hoy y decidir mejor: stock, ventas, clientas con seguimiento, pedidos, agenda, metas, control del equipo, notas y gastos. El dashboard de inicio es la pieza central.

## Positioning

Pensada para el negocio real de una consultora argentina: margen de ganancia por producto y por venta, cuenta corriente de la clienta con pagos parciales, importación de su propio catálogo por Excel/CSV, avisos activos (stock bajo, cobros, cumpleaños) y mensajes de WhatsApp prellenados. La app de referencia solo registra; esta ayuda a decidir.

## Operating Context

Uso diario desde el celular, con una mano, en la calle o en casa de la clienta, con señal irregular (las escrituras deben tolerar offline). Moneda ARS y textos es-AR. Catálogo propio que cada consultora carga; no hay catálogo oficial.

## Capabilities and Constraints

- Plataforma: Android por ahora (decidido); iOS queda para más adelante. Se construye con Expo SDK 58, React Native y TypeScript, con Supabase como backend.
- Módulos de v1: Inicio, Stock/Ventas, Clientas, Pedidos, Agenda, Metas, Equipo/Directoras, Notas, Gastos.
- Privacidad: cada consultora ve solo lo suyo; la directora ve métricas agregadas únicamente si cada consultora acepta compartirlas. Las clientas nunca se exponen a la directora.
- El mínimo de integrantes para ser directora no está definido (configuración futura).
- Dinero en centavos enteros, solo ARS por ahora.
- Fuera de v1: pasarela de pagos, catálogo con imágenes oficiales.

## Brand Commitments

- El nombre de trabajo es «Bella Gestión» (elegido por el usuario el 2026-10-30; reemplaza a «MaryKayByMel»). Es provisorio y su disponibilidad legal no se verificó. «Mary Kay» es marca registrada y bloquea la publicación en las tiendas: no se usa ese nombre.
- No usar el nombre «Mary Kay», «Consultora de Éxito» ni la corona de la app de referencia.
- No se conserva nada del diseño actual (paleta borgoña/rosa/dorado ni las cuatro tipografías): es un rediseño total y el diseño actual es solo evidencia.
- Dirección visual elegida (2026-10-30): el estándar de la categoría, ejecutado con total prolijidad y sin rarezas: app de gestión Material 3 clara. Quedan descartadas, por elección del usuario, las direcciones con personalidad propia que se le mostraron (Libreta, Carta de tonos, Cartel de feria, Filete, entre otras). Nombre de trabajo de la propuesta: «Bella Gestión» (sin definir ni verificar disponibilidad legal).
- Nivel de calidad a alcanzar: a la par de Mercado Pago, el panel de Tiendanube y Nubank.
- El color principal es un rosa propio, pedido expresamente por el usuario como parecido a la familia de colores de Mary Kay: `#D6006E` (provisorio, texto blanco con contraste AA). El usuario aceptó que se parezca a esa familia; no se copian su nombre, logo ni corona. Se evaluó oscurecerlo hacia un berry como `#8E1B5A` para alejarlo de la marca y se descartó por la preferencia del usuario.
- Inspiración pedida por el usuario: el sitio https://www.marykay.com.ar/ (no se pudo leer: respondió HTTP 403). Sirve de referencia de ambiente, nunca de copia de marca, logos ni textos.

## Evidence on Hand

- Video de la app de referencia, 51 s: `C:\Users\Ezequiel\Downloads\mary kay app.mp4`. Su audio promete gestionar stock, cargar ventas, registrar clientas con seguimiento, controlar el equipo, registrar metas y «tener los números claros y ordenados».
- Video de un dashboard de referencia («AI API platform», 14 s): tarjetas KPI con cifra grande y sparkline, barras apiladas con tooltip, chips de estado, barras de progreso con alertas.
- No hay testimonios, clientas reales, imágenes de producto ni catálogo oficial: no inventarlos.

## Product Principles

1. Los números primero: lo que importa hoy se lee de un vistazo al abrir la app.
2. Pensada para el uso real: una mano, poca señal, poco tiempo entre clienta y clienta.
3. Ayuda a decidir, no solo a registrar (margen, saldos, stock bajo, metas con proyección).
4. Marca propia y publicable: nada que dependa de la marca registrada de la empresa de venta directa.
5. La privacidad de las clientas y de cada consultora no se negocia.

## Accessibility & Inclusion

Contraste AA, objetivos táctiles de al menos 44 pt y soporte de fuente grande, sobre todo por el uso al aire libre.
