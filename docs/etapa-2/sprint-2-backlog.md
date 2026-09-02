# Sprint 2 — Cerrar el loop: navegación, cuenta y gestión de campaña

> Construye sobre `docs/etapa-1/spec-tecnico-etapa-1.md` y `sistema-visual-etapa-1.md` — no los reemplaza. Todo lo de acá asume ese modelo de datos y ese sistema visual ya en pie. Alcance: la app deja de ser usable solo por quien conoce las rutas de memoria.

---

## Por qué este sprint y no otro

Todo ítem acá es sobre datos/pantallas que **ya existen** — no hay lógica de reglas de D&D nueva, no hay cambios de modelo de datos grandes (salvo S2-5, que suma campos chicos a `User`). Es deliberadamente de bajo riesgo: cierra huecos de UX antes de sumar la complejidad de dados/hechizos/combate en vivo de sprints futuros.

---

## Tickets

### S2-0. 🔴 Autorización faltante en Server Actions de combate (crítico, hacer antes que nada)

Hallazgo de la regeneración de `project-spec.md` (secciones 7.1 y 7.10), no parte del plan original de este sprint — pero bloquea todo lo demás por severidad. Es la misma familia de problema que D16 (fuga por streaming RSC), aplicada a **escritura**, no lectura: hoy cualquiera puede invocar las Server Actions de combate/participantes/personajes/grupos sin ningún control de sesión o membership. `/combat/[id]/setup` en particular no verifica sesión/membership/rol en absoluto — expone el roster de templates de una campaña ajena y permite disparar acciones sin guard, a diferencia de `/combat/[id]` y `/spectate` que sí quedaron protegidas en D11/D12.

- Auditar TODAS las Server Actions de `combat.ts`, `templates.ts`, `groups.ts` (participantes, daño/curación, condiciones, creación/edición) y agregar el mismo patrón de guard que ya existe en el resto de la app desde D16: usuario autenticado + `CampaignMember` de la campaña dueña del recurso que se está mutando, con el rol correcto (DM-only donde aplique).
- `/combat/[id]/setup`: sumar el guard de sesión/membership/rol que le falta, mismo criterio que D11/D12.
- Regla general a dejar escrita en `spec-tecnico-etapa-1.md` bitácora al cerrar este ticket: el guard tiene que estar en el punto de entrada de CADA mutación, no asumido por herencia de la pantalla que la invoca — la lección de D16 era sobre lectura en `page.tsx`, esto confirma que el mismo descuido puede pasar en las Server Actions de escritura, que son un punto de entrada distinto.

### S2-1. Header de navegación global (reemplaza al Navbar borrado en Sprint 1)

El `Navbar.tsx` original se borró en Sprint 1 (D16) porque apuntaba a rutas descartadas — nada lo reemplazó, por eso hoy no hay forma de volver atrás salvo el botón del navegador.

- Componente de header persistente en el layout raíz (o en el layout de `/campaigns/*`, a definir según cómo haya quedado la estructura de layouts tras Sprint 1): logo/nombre de la app (link a `/campaigns`), y un menú de usuario (avatar o ícono) con dropdown.
- **No es una barra de tabs global** — la decisión 10 del spec técnico (sin nav de secciones globales) sigue vigente. Esto es solo wayfinding básico: "dónde estoy" y "cómo vuelvo a mi lista de campañas".
- Dentro del combate/hub, mantener los back-links contextuales que ya existen (ej. "← Campaña" en el panel de combate).

### S2-2. Botón de logout

Vive en el dropdown del menú de usuario de S2-1 — `signOut()` de next-auth. Ticket chico, pero se lista aparte porque es fácil olvidarlo si S2-1 se prioriza distinto.

### S2-3. Editar campaña

- Nueva ruta `/campaigns/[id]/edit`, DM-only (mismo guard que el resto de rutas de gestión).
- Formulario de nombre/descripción, mismo patrón visual que `/campaigns/new`.
- **Falta el endpoint backend** — Épica C de Sprint 1 solo construyó `POST /api/campaigns` (crear) y `GET` (listar/detalle). Sumar `PATCH /api/campaigns/[id]`, DM-only, validando membership igual que el resto.

### S2-4. Ver el código de invitación después de la creación

Hoy el código solo se muestra una vez, en la pantalla de confirmación post-creación (D5) — si el DM la cierra sin copiarlo, no hay forma de recuperarlo desde la UI (aunque el dato ya viaja en la respuesta de `GET /api/campaigns/[id]` para el rol DM, confirmado en Sprint 1).

- Mostrar el `inviteCode` en el hub de campaña (D8, vista DM) — un chip o sección chica con el código + botón copiar, no hace falta una pantalla nueva.

### S2-5. Recuperar contraseña

Quedó explícitamente pendiente desde Sprint 1 (ticket B4, backlog original). Diseño mínimo:

- `User` necesita campos para el token de reset (`passwordResetToken`, `passwordResetExpires`) — chequear si next-auth v5 con el adapter que estés usando ya provee una tabla de verification tokens reutilizable antes de sumar campos custom.
- Pantalla "Olvidé mi contraseña" (pide email) → envía link vía Resend (ya funcional desde que se verificó el dominio) → pantalla de "Nueva contraseña" con el token en la URL.
- Reusar el mismo criterio de rate-limit básico que ya existe para "reenviar verificación" (Sprint 1, Épica B).

### S2-6. Página de información del personaje (fuera de combate)

Hoy un jugador solo ve un resumen de su personaje dentro del hub ("Mi personaje": nivel, HP, CA) o durante un combate activo (ficha D10). No hay ninguna vista dedicada, accesible en cualquier momento, con el detalle completo de stats.

- Nueva ruta accesible al jugador dueño del personaje (y al DM, para cualquier personaje de su campaña): `/campaigns/[id]/character` (jugador, resuelve su propio `CharacterTemplate` reclamado) — decidir si además se expone una variante para que el DM vea la de cualquier jugador desde el hub.
- **A definir antes de implementar:** ¿es de solo lectura, o el jugador puede editar campos no relacionados a combate (notas, trasfondo)? Los stats numéricos (STR/DEX/etc.) probablemente deberían seguir siendo editables solo por el DM vía `/campaigns/[id]/templates/[templateId]/edit` (D13), para evitar que un jugador se automodifique en medio de una campaña.

### S2-7. Página de información del usuario

- Nueva ruta `/profile` (o `/account`): nombre, email, lista de campañas (reusa `GET /api/campaigns`, ya existe).
- Edición de nombre como mínimo. Cambio de email/contraseña — a definir si entra en este sprint o se pospone (cambiar email interactúa con `emailVerified`, agrega complejidad no trivial).

### S2-8. Campos fantasma en el formulario de personaje

`project-spec.md` 7.2: los formularios de personaje muestran inputs para nivel, competencia, características y agotamiento que `createTemplate`/`updateTemplate` ignoran silenciosamente — hoy no se pueden editar desde ninguna pantalla pese a que la UI sugiere que sí. Conectar esos campos en ambas funciones, o si alguno es intencionalmente de solo-lectura por otro motivo, sacarlo del formulario para no mentirle al usuario.

### S2-9. Iniciativa/turnOrder en 0 al agregar participante a mitad de combate

`project-spec.md` 7.11: `addParticipant` asigna `initiative: 0, turnOrder: 0` sin ninguna UI para corregirlo después, cuando se agrega un participante con el combate ya en curso. Como mínimo, exponer un control para editar esos dos valores manualmente tras agregar tarde a alguien — es una situación común en mesa (un PJ que se une atrasado, un refuerzo que aparece a mitad de pelea).

### S2-10. Login/registro no redirigen con sesión activa

`project-spec.md` 7.13, contradice directamente el mapa de pantallas de `spec-tecnico-etapa-1.md` sección 3 ("si hay sesión activa, redirige directo a /campaigns"). Agregar ese check en `/login` y `/register`.

### S2-11. Combat log bilingüe

`project-spec.md` 7.15: los `notes` que genera `participant.ts` siguen en inglés, contra la decisión 12 (toda la app en español). Traducir los strings generados server-side, no solo la UI que los muestra.

### S2-12. Desincronización de "turno actual" entre panel DM y spectate

`project-spec.md` 7.16 — el más delicado de los cinco: panel DM y `/spectate` calculan el índice de "de quién es el turno" con criterios distintos, con un bug latente específicamente alrededor de combatientes inconscientes-pero-no-muertos (que probablemente deberían saltearse en el orden de turno, o no, según la regla que se esté asumiendo — hay que definir la regla primero y después alinear ambos cálculos a esa única fuente de verdad). Este es el corazón mecánico de un combat tracker — si el DM y el jugador ven turnos distintos, la confianza en toda la herramienta se resiente. Priorizar sobre S2-8/S2-9/S2-11 si hay que elegir por tiempo.

---

## Orden sugerido

0. **S2-0 primero, sin excepción** — es un agujero de seguridad activo en una app ya desplegada, no una mejora de UX. No arrancar nada más de este sprint hasta cerrarlo.
1. **S2-12** — el bug de turno desincronizado es el corazón mecánico del combat tracker; si hay que elegir qué hacer con el tiempo que sobre, va antes que los cosméticos.
2. **S2-1 + S2-2 juntos** — desbloquean la sensación de "app navegable" de inmediato, y son prerequisito práctico para probar cómodamente el resto del sprint sin manipular URLs a mano.
3. **S2-4** — el más chico de todos, una vez que el hub sea fácil de alcanzar vía S2-1.
4. **S2-3 y S2-7** — CRUD simple, en paralelo si hay dos frentes de trabajo.
5. **S2-6** — depende de decidir el alcance (solo lectura vs. edición parcial) antes de escribir código.
6. **S2-10, S2-11** — chicos y sin dependencias, intercalar donde convenga.
7. **S2-8, S2-9** — mismo criterio, sin prisa particular pero no dejar para "después del sprint".
8. **S2-5** — el único con cambio de schema; conviene hacerlo con margen de tiempo, no al final apurado.

## Explícitamente fuera de este sprint

- "Finalizar/cerrar/borrar campaña" — decisión de producto no resuelta (¿soft delete? ¿qué pasa con combates/jugadores asociados?), pospuesta a propósito por el propio equipo.
- Todo lo de dados, bonificadores, roster global de monstruos, trackers de clase, interactividad en combate y mapa — ver `roadmap-futuro.md`.