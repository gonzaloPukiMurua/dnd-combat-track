# Capas de abstracción

> Estado: PROPUESTA (2026-09-27). Describe cómo está hoy y a dónde apuntar. Etiquetas: **[código]** leído · **[docs]** sin verificar.
> **Regla de dependencia:** una capa solo importa de las que están debajo. `domain/` no importa Prisma, React ni Next.

| # | Capa | Dónde vive | Hoy | Problema conocido | Regla objetivo |
|---|---|---|---|---|---|
| 1 | Entorno y datos | Supabase, `.env`, migraciones, seeds | Una sola base compartida, sin `_prisma_migrations`, sin backup | T1, T2 | Dev y producción separadas; backup probado; historial de migraciones consistente |
| 2 | Esquema | `prisma/schema.prisma` | `CharacterTemplate` (definición), `MonsterTemplate`, `TemplateAction`, `Combat*` **[código]** | Sin modelos de habilidades, salvaciones, hechizos, inventario, rasgos, recursos | Definición separada de estado vivo; un solo patrón de catálogo (D-3) |
| 3 | Dominio puro | `src/domain/` | `combat/` (reglas), `dice/`, `templates/` (solo tipos) **[código]** | No hay reglas de personaje; solo `dice` tiene tests | Agregar `character/` (modificadores, competencia, habilidades, salvaciones, fatiga), `progression/` y `challenges/`; todo con tests |
| 4 | Acceso a datos | `queries/`, `lib/actions/mappers/` | Consultas y mappers Prisma → vista **[docs]** | Consultas duplicadas en guards y acciones (T5) | Una lectura por caso de uso; los mappers son el único punto de conversión |
| 5 | Autorización | `proxy.ts`, layouts, `page.tsx`, Route Handlers, `action-guards.ts` | Repartida en 5 puntos **[docs]** | Sin tests; una ruta nueva sin guard queda abierta | Guard en cada punto de entrada nuevo; tests de e2e para cada regla rol×recurso |
| 6 | Casos de uso | `lib/actions/*`, `app/api/**` | Server Actions y Route Handlers conviven; contratos de retorno distintos **[docs]** | `{ok,error}` frente a `throw`/`redirect` | Un contrato único para acciones nuevas; errores en español |
| 7 | Estado cliente | `stores/combatStore.ts`, `hooks/useCombatMutation.ts` | Zustand hidratado una vez por combate, mutaciones optimistas con bloqueo global | T8 | Decidir tras medir (P1); no cambiar el modelo sin datos |
| 8 | UI | `app/**/page.tsx`, `components/**` | Sistema visual "gothic" documentado en `docs/etapa-1/` | Dos paneles duplican controles (`CombatRow`, `CurrentTurnPanel`) **[docs]** | Reutilizar componentes; la ficha solo consume el dominio |
| T | Transversal | tests, docs, idioma | 1 test unitario, 3 e2e; docs con drift | T4, T10 | Tests de dominio por fase; un documento de estado que se actualiza al cerrar cada fase |

## Dónde va cada pedido nuevo

| Pedido | Capa 2 (esquema) | Capa 3 (dominio) | Capas 5–6 | Capa 8 (UI) |
|---|---|---|---|---|
| Ficha completa (U1) | proficiencias por habilidad/salvación, clase, rasgos | modificadores, competencia por nivel, habilidades, salvaciones | guard de dueño del personaje (ya existe `requireTemplateOwner`) | pantalla de ficha |
| Persistencia (U11) | campos de estado en el personaje | reglas de qué se copia y cuándo | write-back atómico con `endCombat`; guard DM | sin cambios visibles |
| Ranuras y recursos (U9) | contador genérico (nombre, máximo, usado, se recupera en descanso) | recuperación por descanso | acciones de gastar/recuperar | panel de recursos |
| Catálogos (U3–U6) | tablas de sistema + contenido de campaña | reglas de "clonar" | guard DM por campaña | explorador, formularios |
| Subida de nivel (U2) | historial de niveles y rasgos ganados | tabla de progresión por clase | guard DM | asistente de subida |
| Cadena de desafíos (U12) | plan, pasos, resultados | resolución de tirada contra dificultad y consecuencia | guard DM | preparación y ejecución |
