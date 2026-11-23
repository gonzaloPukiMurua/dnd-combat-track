# Registro de ítems

> Estado actualizado al 2026-11-22 (versión original: propuesta del 2026-09-27).
> Evidencia: **[código]** leído en el repo · **[DB]** solo lectura, 2026-11-22 · **[git]** commit o PR · **[docs]** sin verificar · **[supuesto]**.
> Tipos: feature · mejora · bug · deuda técnica · infraestructura · QA.

## A. Pedidos de Gonzalo

| ID | Pedido | Tipo | Fase | Estado al 2026-11-22 |
|---|---|---|---|---|
| U1 | Ficha completa del PJ: características y modificadores, competencia, habilidades y salvaciones con competencia, ataques, hechizos, armas, fatiga, notas de clase | feature | P2 (hechizos y armas en P4) | **Hecho en P2**, salvo hechizos y armas (P4). La ficha calcula todo desde `domain/character/` **[código]** |
| U2 | Subida de nivel por el DM (puntos de característica, dotes y rasgos) | feature | P5 | Sin empezar. El DM edita `level` a mano **[código]** |
| U3 | Catálogo global de hechizos | feature | P4 | Sin empezar |
| U4 | Catálogo global de monstruos accesible al DM | mejora | P4 | Sin cambios: hay selector en el setup de combate, pero no pantalla de exploración **[código]** |
| U5 | El DM crea templates de monstruo con características propias | mejora | P4 | Parcial: el DM crea personajes `MONSTER`/`NPC` en su campaña; falta clonar desde el catálogo global **[código]** |
| U6 | El DM crea hechizos y armas/ataques/acciones | feature | P4 | Acciones de ataque/curación: existen (`TemplateAction`). Hechizos y armas: no **[código]** |
| U7 | Lag al tocar acciones de combate | bug | P1 | **Mejorado en P1**: cola de mutaciones sin bloqueo y guard en una sola consulta; mediana de daño de 2357 ms a 1397 ms, medida en local **[git]**. Sigue abierto: medir desde Vercel y los renders de más (T12–T14) |
| U8 | Users borrados en la DB | infraestructura | P0 | **Cerrado.** 3 usuarios en producción **[DB]**. Causa del borrado original: desconocida |
| U9 | Slots de hechizos | feature | P2 | **Hecho en P2** como recurso genérico cargado a mano (D-9). La tabla automática de espacios está diseñada en `catalogo-recursos-clase.md`, sin construir |
| U10 | Probar usabilidad e intuitividad | QA | P1 y P2 | Sin registro escrito de los playtests 1 y 2 |
| U11 | Persistencia entre combates de condiciones, fatiga, ranuras y recursos | feature | P2 | **Hecho en P2** para HP, condiciones y agotamiento: se escriben en la plantilla en la misma transacción que `endCombat` **[código]**. Ranuras y recursos viven en la plantilla y no se tocan durante el combate |
| U12 | Cadena de desafíos/combates para planificar la aventura | feature | P3 | Sin empezar |
| U13 | Catálogo de recursos de clase y tabla de espacios de conjuro | feature | ronda actual | Diseñado (PR #4), sin construir. Requiere confirmar filas contra el PHB 2024 y el cambio de esquema de recarga |
| U14 | Cambios a las plantillas de personaje, monstruo y NPC | por definir | ronda actual | Esperando la lista de Gonzalo |

## B. Hallazgos técnicos

| ID | Hallazgo | Evidencia | Severidad | Estado al 2026-11-22 |
|---|---|---|---|---|
| T1 | Una sola base para desarrollo, e2e y verificación; sin backup | **[DB]** | Alta | **Resuelto en parte**: desarrollo (`ukkrlecodekrjedhiooz`) y producción son proyectos separados. Backup de producción **sin confirmar** |
| T2 | La tabla `_prisma_migrations` no existía | **[DB]** | Alta | **Resuelto**: las dos bases tienen las 23 migraciones del repo, ninguna fallida **[DB]** |
| T3 | `saveHpToTemplates` y `endCombat` separados: el HP se podía perder sin aviso | **[código]** | Media-alta | **Resuelto en P2**: una sola transacción en `endCombat` (`lib/actions/combat.ts`) |
| T4 | Un solo test unitario; sin tests de reglas de combate ni guards | **[código]** | Media | **Resuelto en parte**: 70 tests de dominio verdes (`npm test`). E2E: solo campañas (`edit-campaign`, `header`, `invite-code`); nada de combate ni de guards |
| T5 | Consultas en serie antes de cada acción de combate | **[código]** | Media | **Resuelto en P1**: `loadParticipantAccess` trae todo en una consulta (`action-guards.ts`) |
| T6 | Mensajes de error en inglés en las acciones (`"Amount must be at least 1"`, `"Failed to apply damage…"`) | **[código]** `lib/actions/*` | Baja | **Abierto.** Siguen siendo decenas en `lib/actions/` |
| T7 | Residuos: `joinCode` con comentario `← add this`, `cookies-next`, `HelloWorld.tsx`, archivo `prismaschema.prisma:107` | **[código]** | Baja | **Abierto**, los cuatro siguen |
| T8 | Bloqueo global de mutaciones (`isMutating`) deshabilitaba los controles | **[código]** | Media | **Resuelto en P1**: la cola ya no bloquea los controles (`useCombatMutation.ts`). Queda el costo de render de T13 |
| T9 | No había `.env.example` | **[código]** | Baja | **Resuelto en P0** |
| T10 | Documentos de estado desactualizados | **[docs]** | Baja | **Resuelto** con esta actualización. Regla nueva en el README: actualizar al cerrar cada fase o ronda |
| T11 | D-5 se aplicó a medias: la ficha del jugador calcula la competencia desde el nivel, pero el combate (`CombatantSheet`, "BC +N"), los formularios de crear y editar plantilla y el alta de personaje por invitación siguen leyendo o escribiendo la columna `proficiencyBonus` | **[código]** `CombatantSheet.tsx:50`, `templates/[templateId]/edit/page.tsx:164`, `CreateTemplateForm.tsx:106`, `api/campaigns/[id]/join/character/route.ts:122` | Media (el DM y el jugador ven valores distintos) | **Abierto** |
| T12 | `CombatantRow` usa `memo`, pero recibe `logs` y `allParticipants`, que cambian con cada acción: cualquier mutación vuelve a dibujar todas las filas. Además, cada ficha filtra la bitácora entera, que crece sin límite | **[código]** `CombatView.tsx`, `CombatantSheet.tsx:37` | Media (rendimiento) | **Abierto.** Medir con React DevTools antes de cambiar |
| T13 | Cada fila y el panel del turno leen `isMutating`: cada acción provoca dos renders extra de todas las filas | **[código]** `CombatRow.tsx:44`, `CurrentTurnPanel.tsx:42` | Media (rendimiento) | **Abierto** |
| T14 | `setParticipantInitiative` llama a `revalidatePath` sobre la pantalla de combate, pero el store se hidrata una sola vez por combate: el servidor vuelve a armar una página que se descarta | **[código]** `lib/actions/combat.ts` (`setParticipantInitiative`) | Baja (latencia) | **Abierto** |
| T15 | La cola de mutaciones nunca compara el estado de la pantalla con el del servidor tras un éxito, y mientras se revierte un fallo descarta los clics nuevos sin avisar | **[código]** `useCombatMutation.ts` | Media (la pantalla puede quedar distinta de la base) | **Abierto.** El camino de fallo nunca se probó en vivo |

## C. Fuera del listado (para no perderlo)

- Sincronización en tiempo real (Sprint 5 original): sigue fuera de alcance.
- Finalizar/cerrar/borrar una campaña, nombrar combates, DM ve fichas de jugadores: pendientes declarados en los docs; sin decisión de producto.
- Gastar recursos de clase o espacios de conjuro desde una acción en combate: fuera del diseño del catálogo (§7); se decide después de construirlo.
