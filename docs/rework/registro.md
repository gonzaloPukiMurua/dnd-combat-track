# Registro de ítems

> Estado: PROPUESTA (2026-09-27). Evidencia: **[código]** · **[DB]** (solo lectura, 2026-09-27) · **[docs]** sin verificar · **[supuesto]**.
> Tipos: feature · mejora · bug · deuda técnica · infraestructura · QA.

## A. Pedidos de Gonzalo

| ID | Pedido | Tipo | Capas | Depende de | Fase | Estado hoy |
|---|---|---|---|---|---|---|
| U1 | Ficha completa del PJ: características y modificadores, competencia, habilidades y salvaciones con competencia, ataques, hechizos, armas, fatiga, notas de clase | feature | dominio, esquema, UI | — | P2 (hechizos y armas en P4) | Existe ficha de solo lectura con stats y notas **[docs]**. El esquema no tiene modelos de habilidades, salvaciones, hechizos ni inventario **[código]**. Ninguna función calcula modificadores ni competencias **[código: `domain/`]** |
| U2 | Subida de nivel por el DM (puntos de característica, dotes y rasgos) | feature | dominio, esquema, casos de uso, UI | U1, catálogo de rasgos | P5 | No existe. El DM edita `level` a mano **[código: schema]** |
| U3 | Catálogo global de hechizos | feature | esquema, contenido | D-3, D-7 | P4 | No existe **[código]** |
| U4 | Catálogo global de monstruos accesible al DM | mejora | UI | — | P4 | Hay 9 monstruos y 16 acciones **[DB]**, con selector en el setup de combate **[docs]**. Falta la pantalla de exploración (ticket G) **[docs]** |
| U5 | El DM crea templates de monstruo con características propias | mejora | casos de uso, UI | D-3 | P4 | Parcial: el DM ya puede crear personajes de tipo `MONSTER`/`NPC` en su campaña **[código: `CharacterTemplate.type`]**. Falta clonar desde el catálogo global |
| U6 | El DM crea hechizos y armas/ataques/acciones | feature | esquema, casos de uso, UI | D-3 | P4 | Acciones de ataque/curación: existen (`TemplateAction`, CRUD) **[código]**. Hechizos y armas: no |
| U7 | Lag al tocar acciones de combate | bug | estado cliente, casos de uso, datos | medición (0.5) | P1 | Dos causas verificadas por lectura (ver T5 y T8). **No medido** |
| U8 | Users borrados en la DB | infraestructura | datos | — | P0 (0.3) | **[DB]**: existe 1 user (el tuyo, creado 2026-09-17). Los demás hay que recrearlos. Causa del borrado: desconocida |
| U9 | Slots de hechizos | feature | dominio, esquema, UI | 2.4 | P2 | No existe |
| U10 | Probar usabilidad e intuitividad | QA | — | P1 estable | P1 y P2 (playtests) | Sin guía de prueba |
| U11 | Persistencia entre combates de condiciones, fatiga, ranuras y recursos (el HP ya existe) | feature | esquema, casos de uso, estado cliente | D-2 | P2 | HP: solo si se usa "guardar PV" y con fallo silencioso (T3). Condiciones: solo en `CombatParticipant` (10 archivos las usan). `exhaustionLevel`: solo formulario y ficha, sin conexión al combate **[código]** |
| U12 | Cadena de desafíos/combates para planificar la aventura | feature | dominio, esquema, casos de uso, UI | U11, habilidades y salvaciones | P3 | No existe. No hay entidad de sesión **[código]** |

## B. Hallazgos técnicos

| ID | Hallazgo | Evidencia | Severidad | Fase |
|---|---|---|---|---|
| T1 | Una sola base para desarrollo, e2e y verificación; `DATABASE_URL` y `DIRECT_URL` apuntan al mismo pooler; sin backup | **[DB]** host idéntico · **[docs]** sin backup | Alta | P0 |
| T2 | La tabla `_prisma_migrations` no existe: `migrate deploy` y `migrate dev` no son aplicables tal cual | **[DB]** | Alta | P0 |
| T3 | `saveHpToTemplates` y `endCombat` corren por separado y se ignora el resultado del primero: si falla, el combate termina y el HP no se guarda, sin aviso | **[código]** `src/app/combat/[id]/page.tsx:86` | Media-alta (pérdida de datos) | P1 |
| T4 | Solo hay un test unitario (`roll.test.ts`); nada cubre `rules.ts` (turnos, iniciativa, daño) ni los guards. E2E solo de Sprint 2 (3 specs) | **[código]** búsqueda por nombre de archivo en `src/` y `e2e/` | Media | P0 |
| T5 | Cada acción de combate hace consultas en serie antes de escribir: 2 en el guard (`action-guards.ts:95-105`) + 1 para releer el participante + una transacción; para un jugador, una más | **[código]** `participant.ts:64-94` (lectura de `getParticipantWithRound` pendiente) | Media (causa de U7) | P1 |
| T6 | Mensajes de error en inglés en acciones de combate (`"Amount must be at least 1"`, `"Failed to apply damage…"`), contra la decisión de app en español. `project-spec.md` afirma lo contrario para `participant.ts` | **[código]** `participant.ts:61-62,99` | Baja | P1 |
| T7 | Residuos: `joinCode` e `isPublic` con comentario `← add this`, `cookies-next`, `HelloWorld.tsx`, archivo `prismaschema.prisma:107` | **[código]** `schema.prisma:193` · resto **[docs]** | Baja | tras P2 |
| T8 | El bloqueo global de mutaciones (`isMutating`) deshabilita los controles hasta la respuesta del servidor aunque la UI ya cambió | **[código]** `useCombatMutation.ts:35-44,73` | Media (causa de U7) | P1 |
| T9 | No hay `.env.example` y `.gitignore` (línea 35, `.env*`) lo ignoraría | **[código]** | Baja | P0 |
| T10 | Documentos de estado desactualizados (`project-spec.md` contradice la auditoría y el código) | **[docs]** `docs/audit/` | Baja | actualizar al cerrar cada fase |

## C. Fuera del listado (para no perderlo)

- Sincronización en tiempo real (Sprint 5 original): **no está en tu listado**; sigue fuera de alcance.
- Finalizar/cerrar/borrar una campaña, nombrar combates, DM ve fichas de jugadores: pendientes declarados en los docs; sin decisión de producto.
