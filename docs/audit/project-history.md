# Historia del proyecto — DnD Combat Tracker

> Timeline de **eventos significativos** (no listado de commits). Reconstruido de git, migraciones, docs y consultas de solo lectura a la DB. Los IDs `EV-xx` coinciden con [`project-audit.md`](./project-audit.md), donde están el análisis, la clasificación y la evidencia completa.
> Formato de cada entrada: **Fecha → Evento → Decisión → Cambio → Consecuencia.**
> Etiquetas: `ITERATION` normal · `REWORK` rehacer por decisión/supuesto previo · `REFACTOR` pago de deuda planificado · `UNKNOWN`.
> Horas en `-03:00` salvo indicación. Las fechas de migraciones de Prisma están en UTC.

---

## Vista de conjunto

```text
 MAYO ───────────────────────────── JUL ── AGO ───────────── SEP
 05-02          05-31    07-16/20     08-14        08-24   08-30      09-03        09-15
  │ Fase 1: sin specs, │               │ Fase 2: specs, bitácoras, trailers Claude
  │ commits genéricos  │   (huecos)    │
  ▼                    ▼               ▼
 core combate ─► Zustand ─► espectador  refactor ─► Stitch/spec ─► Sprint 1 ─► Sprint 2 ─► Sprint 3 ─► incidente
                            por cookie  dominio      campañas       (scoping)   (authz)    (monstruos,   de datos
                                                                                            acciones)
```

| Fase | Período | Commits | Régimen de proceso |
|---|---|---|---|
| 1 | 2026-05-02 → 05-31 (19 días) + 07-16/07-20 (2 días) | 36 + 4 | Sin documentos en el repo; asuntos genéricos ("Fixing components"); snapshots `project.zip`/`archive.zip` commiteados en cada paso |
| Hueco | 07-20 → 08-14 | 0 | Sin commits; hay migraciones fechadas 06-05 y 07-21 (commiteadas después) |
| 2 | 2026-08-14 → 09-16 (19 días) | 41 | Refactor previo, spec técnico, backlogs, bitácoras, trailers `Claude-Session`, `CLAUDE.md` con formato de reporte |

---

## Fase 1 — Construcción exploratoria (mayo–julio)

### 2026-05-03 → 05-04 · Schema del día 0 y su reescritura — `EV-01` · `REWORK` (menor)

```text
05-03  Schema inicial (b630c4c)
  ↓
Decisión: modelar una visión amplia — AppState (combate global), RollMode AUTO/MANUAL,
          LogType ATTACK/EFFECT, stats/abilities como JSON, Group/GroupMember.
  ↓
05-04  Migración rewrite_mvp_schema (126e8b2)
  ↓
Cambio: se eliminan AppState, Group, rollMode/rollValue, JSON de stats; se agrega SETUP y currentTurnIndex.
        Group/GroupMember se recrean el 05-17.
  ↓
Consecuencia: costo bajo (dev DB, todo tenía 1–2 días). Muestra que el MVP se definió DESPUÉS del primer schema.
              La intención de tiradas automáticas ya existía el día 0 y volvió en Sprint 3.
```

### 2026-05-04 → 05-07 · UI core de combate — `EV-02` · `ITERATION`

```text
CombatRow: 5 commits en 4 días (283→337→275→422 líneas; diffs de 173–524 por commit), floating current-turn bar, daño/curación, death saves
  ↓
Decisión (implícita): un segundo panel (CurrentTurnPanel, 05-06) replica los controles de daño/curación/objetivo
  ↓
Cambio: CombatRow llega a 22 commits (el archivo más tocado del repo)
  ↓
Consecuencia: exploración legítima; pero nace la duplicación de superficies que reaparece en EV-14
```

### 2026-05-07 → 05-15 (recurre hasta 09-10) · Estado cliente — `EV-03` · `REWORK` recurrente

```text
05-07  useOptimistic local en CombatRow (43afd71)
  ↓
05-12  Decisión: Zustand + useCombatMutation (snapshot/rollback) (9ecb80a)
  ↓
Cambio: 5 commits "Fixing store/rendering/type export" en 3 días; luego 05-31 hidratación, 07-16 re-renders
  ↓
Consecuencia: el store se hidrata UNA vez por combatId. Bugs recurrentes: 09-01 (S2-9) router.refresh no re-hidrata →
              window.location.reload(); 09-10 se documenta la "dependencia implícita de hidratación".
              También impide verificar el panel DM sin navegador (E3/E4).
```

### 2026-05-17 → 05-31 · Grupos, HP persistente, concentración, descanso — `ITERATION`

Commits `5dcf6c4`, `2fcb1e9`, `dc44c52`. Incluye archivos vacíos (`GroupCard.tsx`, `GroupForm.tsx`) commiteados como andamiaje y un `Navbar` de 3 tabs. Sin consecuencias de rework directas, salvo los tres residuos mencionados abajo.

### 2026-05-22 → 08-26 · Espectador por `joinCode` + cookies — `EV-04` · `REWORK`

```text
05-22  "Working on auth and multiplayer views" (c9a5a8e)
  ↓
Decisión (implícita): identificar al jugador con cookies (player_participant_id / player_combat_id) + Combat.joinCode
                      — sin modelo User (no existe hasta 08-24)
  ↓
08-25  /join se reemplaza "en la misma ruta"; 08-26 /spectate deja de depender de las cookies (644114b, 9d817f6)
  ↓
Consecuencia: 2 pantallas rehechas. Residuos hoy: Combat.joinCode/isPublic siguen en el schema y se siguen
              generando en cada startCombat; cookies-next en package.json; comentarios de andamiaje; archivo
              vacío "prismaschema.prisma:107" rastreado.
```

### 2026-06-05 → 09-01 · Stats: participante primero, plantilla después — `EV-05` · `REWORK` menor + error

```text
06-05  Migración add_abilities_scores en CombatParticipant (commiteada el 07-16)
  ↓
07-21  Migración add_template_abilities en CharacterTemplate (commiteada el 08-15, 8413277, con inputs de formulario)
  ↓
08-26  D15: addParticipant copia stats template→participante
  ↓
09-01  S2-8: se descubre que createTemplate/updateTemplate descartaban esos campos en silencio
  ↓
Consecuencia: 17 días con inputs que no persistían. Las migraciones se commitearon 41 y 25 días después de fecharse.
```

---

## Fase 2 — Consolidación, diseño y sprints (agosto–septiembre)

### 2026-08-14 · Refactor de dominio — `EV-06` · `REFACTOR` (legítimo)

```text
Evento: antes del cambio grande, se paga la deuda de EV-03
  ↓
Decisión: extraer domain/combat/{rules,selectors,types}; consolidar 5 queries duplicadas y el mapeo Prisma→store
  ↓
Cambio: 32 archivos, 519+/524−, "sin cambios funcionales", tsc + build verdes (0f149c8)
  ↓
Consecuencia: mejor decisión de proceso del proyecto. Incompleta: spectate conservó su propio cálculo de turno
              ("pre-existing behavior, kept as-is") → explota como S2-12 (EV-10).
```

### 2026-08-15 → 08-24 · Ciclo de diseño Stitch → spec técnico — `EV-07` · `ITERATION` (legítima)

```text
Evento: se congela "qué existe hoy" (project-spec.md, 152 líneas) como insumo de diseño UX/UI
  ↓
Decisión: diseñar campañas/roles/auth en Stitch (2 rondas de addenda — no versionadas) y consolidar en
          spec-tecnico-etapa-1.md + sprint-1-backlog.md + sistema-visual-etapa-1.md
  ↓
Cambio (en diseño, no en código): se descartan estamina, condición persistente, resultado de combate de 3 vías,
        navegación de 4 tabs; se revisa el hub por rol; el nombre GRIMOIRE queda como placeholder
  ↓
Consecuencia: 5+ errores de producto capturados a costo de código ≈ 0. Los mockups y addenda no están en el repo:
              se pierde la traza de decisión. Número de rondas y tiempo: UNKNOWN.
```

### 2026-08-24 → 08-27 · Sprint 1: scoping por campaña — `EV-08` · `REWORK` de propagación

```text
08-24  6 migraciones NOT NULL en 13 minutos (campaign, member, campaignId en Combat/Template/Group) + auth + docs
       en un único commit "Adding features" (7264d49)
  ↓
Decisión (validada en spec): la campaña es la raíz de todo; identidad = cuenta + email verificado
  ↓
08-25/26/27  644114b, 9d817f6, 189aa21
Cambio: aparecen D13 (6 rutas con estilo viejo — "hueco real del plan original"), D14 (Nuevo combate, sin wireframe),
        D15 (links muertos, stats sin copiar) y D16 crítico (crear personaje/grupo fallaba siempre con
        "Missing campaignId"; queries sin scope mezclaban campañas) → 29 archivos movidos, 857+/805−
  ↓
Consecuencia: el concepto no cambió; el costo fue de propagación, descubierta andando. Se hereda además un
              Navbar borrado sin reemplazo hasta 08-31.
```

### 2026-08-27 → 09-03 · Autorización: lectura → escritura → propiedad → nulabilidad — `EV-09` · `REWORK` + hueco de seguridad

```text
08-27  D16: un guard solo en layout no cubre page.tsx → regla "guard en cada page.tsx"
  ↓
08-30  S2-0 (b722f28): las Server Actions de combate/participantes/templates/grupos no llamaban auth();
       cualquiera con un id podía mutar ("agujero activo en una app ya desplegada")
  ↓
08-31  S2-6: requireTemplateOwner — ser DM no alcanza para las notas del jugador
  ↓
09-03  Sprint 3: requireParticipantAccess debe null-guardear templateId
  ↓
Consecuencia: 4 pasadas sobre la misma familia. La detección del vector de escritura vino de regenerar project-spec.md,
              no del diseño ni de un test. Hoy los guards no tienen tests.
```

### 2026-08-30 → 09-01 · Turno actual y participante a mitad de combate — `EV-10` · `REWORK` menor

```text
08-30  S2-12 (6d5d25b): tres cálculos de "de quién es el turno" (panel/store, spectate, hub)
  ↓
Decisión: por primera vez se escribe la regla — un inconsciente-no-muerto conserva su turno; solo 3 fallos lo sacan
  ↓
09-01  S2-9 (083c105): addParticipant creaba turnOrder: 0 (colisión); se extrae computeTurnOrder
  ↓
Consecuencia: 4 archivos / 8 archivos. La regla ya estaba en rules.ts; solo faltaba escribirla y alinear consumidores.
              addParticipantsFromGroup conserva turnOrder: 0 (latente).
```

### 2026-08-31 → 09-03 · Pivote de verificación — `EV-11` · `ITERATION` forzada

```text
Evento: E4 y otros cierres "sin verificar — extensión de Chrome no conectada"
  ↓
Decisión: agregar Playwright (3 specs) e Impeccable, "fuera del backlog original"
  ↓
Cambio: 9fa1e7f "Changes" (178 archivos) agrupa S2-1/2/3/4/7 + Playwright + Impeccable sin mensaje.
        El patrón "Server Action que hace fetch a su propia route" deadlockea el dev server bajo e2e → se abandona parcialmente
  ↓
Consecuencia: dos arquitecturas para features gemelas (PATCH /api/campaigns/[id] sin consumidor vs. /api/profile);
              e2e limitado a lo alcanzable sin extender fixtures; E4 sigue abierto.
```

### 2026-09-03 → 09-08 · Sprint 3: monstruos y `templateId` nullable — `EV-12` · `REWORK` (3 resoluciones)

```text
09-03  Decisión (spec, Opción B): MonsterTemplate separado; CombatParticipant.templateId opcional (3d26edb)
       — el spec lista UN efecto colateral (requireParticipantAccess)
  ↓
       Cambio real: tsc/build rotos en main por el clúster types/mappers/CombatRow/SpectateView/store/spectate/setup;
       el desarrollador decide "reportar, no arreglar sin decidir la forma"
  ↓
09-04  2c554bf: template pasa a nullable en tipos
09-08  c8b939a: cambio de solución — template sintético type:MONSTER en el mapper
  ↓
Consecuencia: 3 resoluciones en 5 días; main roto ~1 día; el store queda dependiente de hidratarse desde el mapper (d05360a).
```

### 2026-09-08 → 09-11 · Adendas de Sprint 3 — `EV-13` · `ITERATION` con `REQUIREMENTS GAP`

```text
09-08  §7b: TemplateAction.uses — "surgió al armar el seed" (multiataque); regla: "campo estructurado nuevo
       necesita un consumidor mecánico ya planeado"
  ↓
09-11  §4b: economyType — "surgió probando la app"; las acciones no se conectaban a actionUsed/bonusUsed/reactionUsed,
       que existen desde 05-06. Migración + segundo pase por CRUD y seed (de99151)
  ↓
       Tickets G (bestiario navegable — no implementado) y H (extender a CurrentTurnPanel) nacen de feedback / cierre de F
  ↓
Consecuencia: migraciones aditivas con default = baratas; costo = un segundo pase por lo recién escrito.
```

### 2026-09-10 · Implementación duplicada en dos copias — `EV-15` · trabajo descartado

```text
23:25  de48cde implementa economyType + CRUD de acciones sobre a578095, sin a2e0adc (que ya hacía ese CRUD)
  ↓
       reflog: reset a origin/main; 09-11 00:20 de99151 rehace economyType sobre a2e0adc
  ↓
Consecuencia: un pase de implementación descartado; sobrevive en la rama backup-fork-e-economytype.
              Antecedentes: merge fa27fd8 (08-20), backup-local-20260831. Causa: UNKNOWN.
```

### 2026-09-11 → 09-13 · Flujo guiado: F → H → hook — `EV-14` · `REWORK` planificado en 2 pasos

```text
09-11  F (0724a6b): flujo economía→acción→tirada vs CA en CombatRow; GuidedActionPanel solo presentacional
  ↓
09-13  H (54c2c36): el spec pide "reusar el panel tal cual"; el estado vive en el host → se duplican 189 líneas
  ↓
09-13  8530a1a: se extrae useGuidedAction (227+/254−). Registrado "como parte de la historia"
  ↓
Consecuencia: supuesto de reuso inválido, verificable leyendo F. La causa profunda es la duplicación de paneles de EV-02.
              El hook no se probó como hook de React; verificaciones por scripts que evitan auth().
```

### 2026-09-15 → 09-17 · Pérdida de datos en Supabase — `EV-16` · `UNKNOWN`

```text
09-15 20:45  Crear campaña falla con P2003 (Campaign_ownerId_fkey): la sesión JWT apunta a un User inexistente
  ↓
09-15 noche  Conteo por tabla: todas las tablas de app en 0; sin backup. Relato oficial: no hay comando destructivo
             en 13 sesiones; causa sin determinar
  ↓
09-16  aa76c5a: política de DB destructiva en CLAUDE.md; README reescrito (e27238c)
  ↓
09-17 03:30 UTC  Se re-siembran User/Campaign/Templates/Combat (createdAt de las filas actuales)
  ↓
Auditoría (09-18, solo lectura): MonsterTemplate.createdAt = 09-11 00:16 -03 (no el 09-08 ni el 09-15+);
       _prisma_migrations no existe; el log de Supabase registra 42P01 el 09-15 22:34 -03.
  ↓
Consecuencia: el relato no explica los tres hechos. Ventanas plausibles: ≈09-08→09-11, ≤09-15, o evento de infraestructura.
              Causa raíz: UNKNOWN (ver project-audit.md §9 y P8).
```

---

## Hitos de documentación (para leer junto al timeline)

| Fecha | Documento | Nota |
|---|---|---|
| 08-24 | `project-spec.md` v1, `spec-tecnico-etapa-1.md`, `sprint-1-backlog.md`, `sistema-visual-etapa-1.md` | Todo en `7264d49` |
| 08-30 / 09-01 | `sprint-2-backlog.md`, `roadmap-futuro.md`; `project-spec.md` regenerado | La regeneración descubrió S2-0/8/9/10/11/12 |
| 09-03 | Bitácora S2-5 | 2 días después de regenerar `project-spec.md`, éste queda desactualizado |
| 09-03 → 09-11 | Specs de Etapa 3 (monstruos, acciones/tiradas) + adendas §4b/§7b/§8 | Decisiones con opciones descartadas; adendas "post-diseño" |
| 09-10 | `CLAUDE.md`: formato de reporte | Reacción al patrón de shared-calc/authz `[I]` |
| 09-13 | Bitácora C–H (§11) | Cubre de99151, F, H, hook; C/D/E solo en cuerpos de commit |
| 09-16 | README reescrito; incident log; `CLAUDE.md` con política de DB | El README enlaza `.env.example` (inexistente) y `roadmap-futuro.md` en ruta incorrecta |
