# Roadmap futuro — Sprints 3, 4, 5 (no ejecutar todavía)

> ⚠️ **Este documento es memoria, no un backlog listo para trabajar.** A diferencia de `sprint-1-backlog.md` y `sprint-2-backlog.md`, acá no hay tickets con criterios de aceptación — es una lista priorizada de features futuras con el contexto mínimo para no perder el hilo entre conversaciones. Cuando llegue el momento de encarar alguno de estos sprints, hay que sentarse a diseñarlo con el mismo nivel de detalle que se usó para la etapa 1 y el sprint 2 (spec técnico + wireframes/mockups + backlog de tickets) antes de pasárselo a un agente de código.

---

## Sprint 3 — Mecánica de personaje: tiradas y contenido base

- **Tiradas de dados** (d4, d6, d8, d10, d12, d20, d100) — el primer paso real hacia automatizar reglas, que en la etapa 1 quedó explícitamente fuera de alcance.
- **Campos de bonificador de salvación y de habilidad** en el personaje.
- **Tiradas de habilidad** (usando esos bonificadores).
- **Roster global de monstruos básicos** (goblins, trasgos, orcos, ogros, esqueletos, etc.), cargado manualmente por vos como desarrollador, disponible para todas las campañas sin que cada DM tenga que recrearlos.

**Nota de arquitectura, importante para cuando se diseñe este sprint:** el roster global **contradice a propósito** una decisión ya cerrada en la etapa 1 — "el personaje pertenece a la campaña, no es portable" (decisión 2, `spec-tecnico-etapa-1.md`). Un monstruo global sin dueño de campaña es exactamente el caso que esa decisión excluía. No es un error, es una extensión legítima, pero implica tocar el modelo central otra vez: `CharacterTemplate.campaignId` tendría que volverse nullable, más algún flag (`isGlobal` o similar) que distinga "plantilla de sistema" de "personaje de campaña". Vale la pena resolver esto en el mismo sprint que las tiradas de dados, ya que ambos tocan `CharacterTemplate`.

---

## Sprint 4 — Recursos de clase e interactividad en combate

- Roster de hechizos típicos de combate, asignables al personaje.
- Seguimiento de slots de hechizo.
- Seguimiento de Furia (Bárbaro).
- Seguimiento de Segundo Aire y Oleada de Acción (Guerrero).
- Seguimiento de Pool de Imposición de Manos (Paladín).
- Seguimiento de maniobras de batalla (Battle Master).
- Otros trackers de recursos de clase de alto uso estadístico, mismo patrón que los anteriores.
- **Interactividad entre personajes en combate**: seleccionar a otro combatiente como objetivo de un hechizo (single-target o área), disparando que el/los objetivo(s) deban tirar salvación.

**Nota de secuenciación, para decidir al diseñar este sprint:** los trackers de recursos de clase (Furia, Segundo Aire, imposición de manos, maniobras) son, en esencia, **contadores personales sin necesidad de sincronía en tiempo real** — un jugador lleva la cuenta de su propio personaje, alcanza con que el modelo tenga esos campos. La **interactividad entre personajes**, en cambio, si no tiene algo de tiempo real, va a ser una experiencia pobre (el otro jugador no se entera que le toca salvar hasta refrescar). Evaluar en su momento si conviene **partir este sprint en dos**: trackers primero (sin sockets, más simple y rápido), interactividad después (junto con la infraestructura de sockets). No asumir que tienen que salir juntos solo porque quedaron listados juntos acá.

---

## Sprint 5 — Sincronía en tiempo real

- Implementación de sockets (o equivalente: WebSockets, Server-Sent Events, o un servicio como Pusher/Ably) para que DM y jugadores vean cambios de estado sin refrescar.
- Esto es lo que finalmente resuelve gaps que quedaron señalados desde la etapa 1 (`spec-tecnico-etapa-1.md` sección 7: "sin sincronización en tiempo real" listado como fuera de alcance explícito).
- Prerequisito real para que la interactividad de Sprint 4 (seleccionar objetivo → disparar salvación en el otro dispositivo) tenga sentido de usar en mesa.

---

## Sprint 6 (o más adelante) — Mapa de combate

- Mapa con cuadrícula, tokens de personajes, y simplificaciones de terreno (terreno difícil, agua, árboles).
- Depende de que el resto de la mecánica de combate (turnos, tiradas, condiciones) esté sólida — es la pieza de mayor superficie visual y probablemente la que más iteración de diseño necesite, en la línea de lo que fue el trabajo con Stitch en la etapa 1.

---

## Pendiente sin sprint asignado

- **Finalizar / cerrar / borrar una campaña** — mencionado en Sprint 2 y descartado a propósito de ahí. Necesita una decisión de producto primero (¿soft delete? ¿qué pasa con el historial de combates y el acceso de los jugadores?), no solo una pantalla. No asignar a un sprint hasta que esa decisión exista.
