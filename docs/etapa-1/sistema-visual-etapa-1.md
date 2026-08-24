# Etapa 1 — Sistema visual consolidado

> **Reemplaza a `brief-diseno-visual-stitch.md`.** Incorpora las correcciones de `addendum-correcciones-stitch.md` y `addendum-v2-funcional-stitch.md`, ya obsoletos como fuente de verdad. Los tokens de esta sección están verificados contra el `DESIGN.md` real exportado por Stitch — son los que ya están en el código generado, no una propuesta.

---

## 1. Dirección visual — resumen

**Fantasía oscura, bajo medieval (gótico tardío / renacentista temprano), alto contraste para legibilidad rápida en mesa. Sin texturas de superficie (madera, pergamino, piedra) — todo resuelto con color plano, tipografía y bordes/biseles sutiles vía sombra.**

Composición inspirada en ilustración a tinta estilo Frazetta; vocabulario cromático de estados críticos inspirado en paleta de fuego (rojo/negro saturado).

---

## 2. Design tokens (verificados en código)

### 2.1 Color

| Token | Hex | Uso |
|---|---|---|
| `background` | `#131313` | Fondo base |
| `surface-low` | `#1c1b1b` | Cards, contenedores de primer nivel |
| `surface` | `#141311` / `#201f1f` | Cards anidadas (ver nota) |
| `surface-high` | `#2a2a2a` | Elementos interactivos neutros |
| `on-surface` | `#e7e2dd` | Texto principal |
| `on-surface-variant` | `#cdc6b8` | Texto secundario y cifras de juego (con fuente mono) |
| `outline` | `#969084` | Bordes con énfasis |
| `outline-variant` | `#4b463c` | Bordes sutiles entre cards |
| `danger` | `#93000a` | Daño, HP crítico, acción destructiva |
| `danger-bright` | `#ffb4ab` | Alerta activa (HP ≤25%, animado) |
| `success-bg` | `#2d4036` | Fondo de acción de curación |
| `success-text` | `#b3e0c7` | Texto/ícono sobre curación |
| `brass-bright` / `accent-brass` | `#f0e2ba` / `#d4c69f` | Acento de estado activo, bordes de foco, badge de rol DM |
| `primary` | `#f1e2b9` | Texto de énfasis (headlines destacados, títulos de pantalla) |
| `wine` / `secondary-container` | `#6d3b3b` | Fondo de botón "Daño" |

> Nota: `DESIGN.md` trae además el set completo de tokens Material 3 (tertiary, error-container, etc.) heredado de la generación automática de Stitch. La tabla de arriba es el subconjunto que realmente se usa en las pantallas — no hace falta poblar los demás a mano, pero están disponibles si Stitch los vuelve a usar en pantallas nuevas.

### 2.2 Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Headlines | `EB Garamond` 600/700 | Nombres de campaña, personaje, títulos de pantalla |
| Cuerpo y UI general | `Hanken Grotesk` 400/500 | Todo texto de lectura, **labels, botones, microcopy** |
| Datos de juego | `JetBrains Mono` 500 | **Exclusivo para cifras**: HP, AC, modificadores, iniciativa, código de invitación |

⚠️ **Regla que se violó una vez y hay que sostener activamente**: JetBrains Mono es solo para números de mecánica. Cuando se aplicó a labels/botones/microcopy de la pantalla de Login en la primera tanda, el resultado leyó como interfaz de terminal/sci-fi en vez de gótico-renacentista. Ya está corregido en el código actual, pero es el error más probable si se genera una pantalla nueva sin pasarle este documento como contexto.

Escala: display 48px/56px · headline 32px/40px · headline-sm 24px/32px · body 16–18px · data-label 14px, tracking +0.05em.

### 2.3 Forma y superficie

- Radios pequeños (2–4px) en toda la app — confirmado como estándar único después de que una pantalla saliera con `rounded-none` (radio 0) por drift entre generaciones. Si una pantalla nueva sale con radio distinto al resto, es un bug de consistencia, no una variante válida.
- Sin imágenes de fondo ni texturas. Bisel metálico vía `inset box-shadow`, bordes de hierro/latón vía `ring` de 1–2px.
- Elevación (`surface-low → surface → surface-high`) solo por escalón de gris, sin blur exagerado.

---

## 3. Componentes reutilizables (verificados en código, no solo propuestos)

- **Dial circular de HP** — anillo de progreso, readout en mono al centro. Color condicional: `brass-bright` por encima del 25%, `danger-bright` + pulso por debajo. *(Este comportamiento condicional se perdió en la primera tanda de Stitch — el anillo quedó en rojo fijo — y ya está corregido; verificar que se mantenga en pantallas nuevas.)*
- **Badge hexagonal de AC** — clip-path de escudo, fondo plano `surface-high`, borde `outline`.
- **Badge circular de Temp HP** — ring en `accent-brass`.
- **Botones de acción rápida** (Daño / Curar / Condición) — color semántico de fondo, ícono + label.
- **Stat cards** (STR/DEX/CON...) — label a la izquierda, valor + modificador a la derecha, sombra interna.
- **Combat log / ledger** — timeline vertical con puntos de color por tipo de evento.
- **Cards de lista** (campañas, combates) — fondo `surface-low`, borde `outline-variant`, badge de rol en `accent-brass`.
- **Barra de HP en lista de combate** — reemplaza al número puro como elemento de escaneo principal; mismo criterio de color condicional que el dial.
- **Opción "crear/agregar" con borde punteado** — convención visual para distinguir "esto crea algo nuevo" de "esto selecciona algo existente" (usado en elegir personaje, debería reusarse en "Nuevo combate" del hub DM).
- **Bloque de estado de personaje/grupo** — nuevo, agregado por Stitch en la segunda tanda y adoptado: en el hub de campaña, arriba de la lista de combates, muestra PV/Estamina/Condición — agregados del grupo si el rol es DM, del personaje propio si el rol es Jugador.

---

## 4. Estado de las 12 pantallas (al cierre de la etapa)

| # | Pantalla | Estado visual/código | Pendiente |
|---|---|---|---|
| 1 | Login | ✅ Corregida (tipografía, copy, sin lenguaje "hacker") | — |
| 2 | Registro | ✅ OK | — |
| 3 | Mis campañas | ✅ OK | — |
| 4 | Crear campaña | ✅ OK | — |
| 5 | Confirmación de campaña | ✅ Corregida (código 6 caracteres, sin guión) | Revisar que el copy de "no vence / una sola vez" esté en español al hacer la pasada de traducción manual |
| 6 | Unirse con código | ✅ Corregida (banner de verificación de email agregado) | Copy pendiente de traducción manual: queda "Game Master" y "pergamino de iniciación" sin resolver — el segundo es irónico dado que la regla visual prohíbe pergamino como *textura*, pero como *palabra* de copy quedó colada; decidir si se saca en la pasada de traducción |
| 7 | Elegir personaje | Sin regenerar desde la primera tanda | 100% en inglés — pendiente de traducción manual. La captura `.png` se vio en blanco en ambas tandas por falla de carga de imágenes externas al momento del screenshot; el HTML tiene contenido completo, revisar en vivo en Stitch antes de asumir que está rota |
| 8-9 | Hub de campaña (DM / Jugador, misma ruta) | DM ✅ corregido y con bloque de estado agregado. Jugador sin regenerar | Jugador 100% en inglés — pendiente de traducción manual. Implementar como una sola ruta condicionada por rol (ver spec técnico, decisión 6) |
| 10 | Ficha de combatiente | ✅ OK, dial de HP con color condicional corregido | — |
| 11 | Vista de combate — DM | ✅ OK, alta fidelidad al wireframe original | — |
| 12 | Vista de combate — Jugador | ✅ OK, implementa correctamente ocultar HP exacto de otros combatientes (estado cualitativo tipo "Herido") | — |

---

## 5. Cómo pedirle pantallas nuevas a Stitch (para no repetir el drift)

1. Trabajar dentro del mismo proyecto/canvas donde ya están las 9-12 pantallas generadas — no arrancar uno nuevo.
2. Pegar este documento completo como contexto de estilo antes de pedir una pantalla adicional.
3. Pedir pantallas puntuales, no el set completo de nuevo, para no arriesgar que se regeneren las que ya están corregidas.
4. Cualquier pantalla que vuelva con textura de superficie, radio de borde distinto, o mono aplicado fuera de cifras de juego, se regenera — son los tres defaults que Stitch tiende a reintroducir sin que se le pida.
