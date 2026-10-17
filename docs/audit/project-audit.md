# Auditoría retrospectiva — DnD Combat Tracker

> **Tipo:** auditoría externa post-desarrollo. Solo inspección y documentación: no se modificó código, schema, dependencias, tests ni `CLAUDE.md`.
> **Estado auditado:** `main` @ `aa76c5a` (2026-09-16). Fecha de la auditoría: 2026-09-18.
> **Complemento:** la cronología de eventos está en [`project-history.md`](./project-history.md) (mismos IDs `EV-xx`).
> **Uso previsto:** insumo para `freelance-web-os`. Este documento **no** propone cambios al OS ni al proyecto (se compara después con el proyecto de la fotógrafa).

---

## 0. TL;DR

1. **La hipótesis inicial está parcialmente confirmada, pero el mecanismo no es el que se sospechaba.** El rework evitable no viene principalmente de "requisitos de features mal definidos" (Sprint 1–3 tienen specs detalladas y muchas decisiones bien justificadas), sino de **decisiones de alto costo de reversión tomadas sin enumerar su superficie de impacto** (scoping por campaña, autorización de escritura, `templateId` nullable, cálculo de turno duplicado) y de **reglas de dominio que nunca se escribieron** (turno con inconsciente-no-muerto, unirse a mitad de combate, economía de acción ↔ `actionUsed`). La misma clase de hueco apareció en cinco hallazgos consecutivos (D16, S2-0, S2-6, `templateId` nullable, S2-12: EV-08/09/10/12).
2. **Lo más riesgoso hoy no es de producto sino de entorno:** una sola base Supabase compartida por desarrollo, e2e, scripts de verificación y migraciones; sin backup; sin historial de migraciones (`_prisma_migrations` **no existe** hoy — verificado en vivo); y un incidente de pérdida de datos cuyo relato documentado **no coincide** con la evidencia de la DB (§9). Causa raíz: UNKNOWN.
3. **Sin verificar:** e2e (no se corrió: escribe en la DB compartida), lint/build, todo lo que requiere navegador, los artefactos de Stitch y el historial de chats (no están en el repo). El período mayo–julio no tiene ninguna spec en el repo, así que sus requisitos originales son UNKNOWN.

---

## 1. Método, fuentes y límites de la evidencia

### 1.1 Qué se inspeccionó

| Fuente | Cómo |
|---|---|
| Git: 81 commits, 2 branches locales de respaldo, reflog, trailers `Claude-Session` | `git log/show/reflog`, stats por commit |
| Docs: `project-spec.md`, `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `AGENTS.md`, `docs/etapa-{1,2,3}/*` | lectura completa |
| Schema + 19 migraciones | lectura; comparación init vs. estado actual |
| Código (`src/`, ~11.8k líneas) | greps dirigidos + lectura de archivos clave |
| Tests: `e2e/*.spec.ts`, `src/domain/dice/roll.test.ts` | lectura; selectores contra `data-testid` reales |
| Artefactos sueltos: `project.zip`, `docs/etapa-2/files.zip`, `supabase_logs.json`, `prismaschema.prisma:107` | listado / lectura |
| Supabase (DB real) | **solo SELECTs**, previa impresión del destino (host/puerto/db, sin credenciales) |

### 1.2 Qué se ejecutó (todo de solo lectura)

- `npx tsc --noEmit --incremental false` → salida vacía, exit 0.
- `node --experimental-strip-types --test src/domain/dice/roll.test.ts` → `tests 22 / pass 22 / fail 0`.
- Contra `aws-1-us-west-2.pooler.supabase.com:6543`, db `postgres` (mismo host en `DATABASE_URL` y `DIRECT_URL`): conteos por tabla, `to_regclass('public._prisma_migrations')`, rangos de `createdAt`, columnas de `information_schema`.

### 1.3 Qué NO se hizo

- No se corrió Playwright (su `global-setup` hace upserts en la DB compartida) ni `npm run build` ni `npm run lint`.
- No hay navegador: nada de UI verificado en vivo.
- No hay acceso a: artefactos/exports de Stitch, los addenda `addendum-correcciones-stitch.md` / `addendum-v2-funcional-stitch.md` (el spec dice que existieron y quedaron obsoletos), historial de chats web, ni los transcripts de las sesiones de Claude Code.

### 1.4 Etiquetas de evidencia

`[G]` git · `[D]` documento · `[C]` código actual · `[R]` verificado por mí en esta auditoría (comando/consulta) · `[I]` inferencia · `UNKNOWN` sin evidencia suficiente.

### 1.5 Nota sobre "3–4 semanas"

El repo muestra **40 días con commits** repartidos en dos bloques: 2026-05-02→05-31 (19 días) + 07-16/07-20 (2 días) por un lado, y 2026-08-14→09-16 (19 días) por otro. El bloque de agosto–septiembre (~5 semanas calendario) es el que coincide con "3–4 semanas de trabajo real" y es el único con specs, bitácoras y trailers de Claude. Los commits miden actividad, no esfuerzo: la cifra real es una pregunta abierta (§15, P1).

---

## 2. Veredicto sobre las hipótesis iniciales

| Hipótesis | Veredicto | Evidencia principal |
|---|---|---|
| Requisitos insuficientemente definidos | **Parcial.** Cierto para reglas de dominio y requisitos transversales; falso para features de Sprint 1–3 (specs extensas). May–Jul: UNKNOWN (sin docs). | EV-09, EV-10, EV-13 |
| Scope ambiguo / mal interpretado | **Parcial.** Los "a definir" fueron declarados explícitamente y resueltos con decisión registrada (S2-6, D14). La ambigüedad no declarada es la de mayo (identidad/multijugador). | EV-04, §4 |
| Decisiones de producto tomadas durante implementación | **Confirmada, pero de forma acotada y registrada** (S2-6 "solo lectura + notas", economía de acción). No hay evidencia de decisiones de producto tomadas *sin* registro. | EV-13, §4 |
| UX/UI definida demasiado tarde | **Confirmada para el sistema visual y la navegación** (3 meses de UI sin tokens; `Navbar` borrado el 08-25 sin reemplazo hasta el 08-31). **Falsa para Sprint 1**, que sí hizo diseño→spec→código. | EV-07, EV-08, EV-11 |
| Arquitectura/modelo definidos antes de entender el problema | **Confirmada para el schema del día 0 y el estado cliente** (EV-01, EV-03). El modelo de Etapa 1 (campañas) fue bien razonado pero mal *dimensionado* en su impacto (EV-08). | EV-01/03/08 |
| Decisiones que afectan muchas partes sin *impact surface* previo | **Confirmada — es el hallazgo más fuerte.** | EV-08, EV-09, EV-10, EV-12 |
| Implementación iniciada antes de que la decisión madurara | **Confirmada en casos puntuales de Sprint 3** (`uses`, `economyType`, hook compartido); resueltos en horas/días, costo bajo. | EV-13, EV-14 |

**Contra-evidencia (lo que funcionó):** diseño en herramienta barata antes de código (Stitch) detectó 5+ errores de producto a costo ~0 en código (§EV-07); refactor de consolidación *antes* del cambio grande (EV-06); specs con opciones descartadas y motivos (Etapa 3 §2); regla "campo estructurado nuevo necesita consumidor mecánico" (§7b); bitácoras con "qué NO se verificó" explícito; auditoría regenerando `project-spec.md` que encontró S2-0/8/9/10/11/12.

---

## 3. Q1 y Q2 — Qué se quería construir vs. qué se construyó

### 3.1 Intención original (reconstruida de evidencia indirecta) — `UNKNOWN` en su formulación exacta

No hay ninguna spec, README ni nota de mayo en el repo (el README era el de `create-next-app` hasta 2026-09-16). La intención se infiere **solo** del schema del día 0 (`b630c4c`, 2026-05-03) `[G]`:

- Herramienta de **un solo DM, un combate global**: `AppState { currentCombatId }`, `Combat.status ∈ {ACTIVE, FINISHED}`.
- Plantillas de personaje `PLAYER/NPC/MONSTER` con `stats Json`, grupos con cantidad, participantes con HP/temp HP/CA modificable/iniciativa/condiciones.
- **Ya preveía tiradas automáticas:** `RollMode { MANUAL, AUTO }`, `CombatLog { rollMode, rollValue }`, `LogType { ATTACK, EFFECT }`. Es decir, la visión de largo plazo incluía automatizar tiradas desde el día 0; lo que cambió fue la *secuencia* (fuera de alcance en Etapa 1, vuelve en Sprint 3).

### 3.2 Qué terminó construyéndose `[C][D]`

Una app multiusuario con: cuentas (email+contraseña, Google, Discord, verificación, reset, perfil) · campañas con miembros/roles/código de invitación · plantillas de personaje y grupos **anidados por campaña** · combate con iniciativa, HP/temp HP, CA, condiciones, tiradas de muerte, economía de acción, reorden drag-and-drop, log · vista espectador para jugadores con HP cualitativo · ficha de personaje de solo lectura + notas · roster global de 9 monstruos · acciones guardadas (ataque/curación) con flujo guiado de tirada vs. CA · motor de dados (`NdM±K`) · sistema visual "fantasía oscura" · e2e Playwright (3 specs) · guards de autorización en 5 capas.

**Distancia entre ambos:** el eje de identidad/tenencia (usuarios, campañas, roles) no existía en el diseño del día 0 y terminó siendo la columna vertebral del sistema (6 migraciones NOT NULL en 13 minutos, `EV-08`).

---

## 4. Scope

### 4.1 Alcance original — ver §3.1 (`UNKNOWN` en detalle).

### 4.2 Alcance evolucionado y clasificación

| # | Aparición | Cambio | Clasificación | Evidencia |
|---|---|---|---|---|
| S-01 | 05-06→05-18 | Daño/curación, barra de turno actual, death saves, concentración, descanso, grupos, persistencia de HP | Exploración/prototipado sobre el core | `[G]` eccda5c, 8c45fad, 0e79b0f, 2fcb1e9, dc44c52 |
| S-02 | 05-22 | Vista espectador con `joinCode` + cookies | Nueva funcionalidad **con requisito de identidad no definido** | `[G]` c9a5a8e; hoy `joinCode` es código muerto |
| S-03 | 08-15 | Reorden drag-and-drop de turnos | Nueva funcionalidad; origen UNKNOWN (sin spec) | `[G]` 4d832b1 |
| S-04 | 08-24 | Campañas, roles, auth real, OAuth | **Cambio de dirección** deliberado y documentado | `[D]` spec Etapa 1 §1 |
| S-05 | 08-26/27 | D13 (retokenizar 6 rutas), D15 (loose ends), D16 (anidar rutas) | **Consecuencia necesaria** de S-04 | `[D]` backlog "hueco real del plan original" |
| S-06 | 08-30 | S2-0 autorización en Server Actions | **Consecuencia necesaria** (agujero de seguridad) | `[D]` backlog S2-0 |
| S-07 | 08-31 | Playwright + Impeccable "fuera del backlog original" | Herramientas; Playwright = consecuencia de B2 (sin navegador) | `[D]` bitácora §8 |
| S-08 | 08-31 | Link "Mi perfil" en `UserMenu` | **Aclaración** ("fuera del ticket, confirmado con el usuario") | `[D]` S2-7 |
| S-09 | 09-03→09-13 | Sprint 3 | Ver 4.4 | `[D][G]` |
| S-10 | 09-16 | README reescrito | Consecuencia (deuda de doc) | `[G]` e27238c |

### 4.3 Ambigüedad de scope (nunca suficientemente definido)

- **Identidad del jugador en mayo:** el commit dice "auth and multiplayer views" pero no hay modelo `User` hasta 08-24 `[G]`. Qué significaba "multijugador" en mayo: UNKNOWN.
- **DM ve la ficha de cualquier jugador** (S2-6): dejado "a definir", **no construido** `[D]`.
- **Finalizar/cerrar/borrar campaña:** "decisión de producto no resuelta", pospuesto dos veces `[D]`.
- **Nombrar un combate:** todos se llaman "New Combat" (project-spec 7.8) — no hay ticket.
- **Cambio de email/contraseña:** fuera de alcance por interacción con `emailVerified` `[D]`.
- **Concurrencia en `/join/character`:** declarado pendiente desde Etapa 1 §6 `[D]`.
- **Salvaciones + bonificadores de habilidad:** "documento combinado pendiente", ninguna decisión tomada `[D]`.

### 4.4 Sprint 3 vs. roadmap — cambio de dirección con origen UNKNOWN

`roadmap-futuro.md` definía Sprint 3 como: dados, campos de bonificador de salvación/habilidad, tiradas de habilidad, roster global. **Construido:** dados, roster, y un **sistema de acciones guardadas con tirada de impacto vs. CA + economía de acción** (no estaba en el roadmap). **No construido:** bonificadores de salvación/habilidad, tiradas de habilidad. El spec `acciones-tiradas` presenta "Alcance decidido" sin registrar quién/qué lo motivó. Clasificación: `CLIENT/USER CHANGE` o decisión del desarrollador — **UNKNOWN** (§15, P5).

### 4.5 Contracción de scope

| Qué | Cuándo | Evidencia |
|---|---|---|
| `AppState`, `RollMode`, `ATTACK/EFFECT`, `stats Json` del schema del día 0 | 05-04 | `[G]` migración `rewrite_mvp_schema` |
| Identidad por cookie (`player_participant_id`) | 08-26 (D12) | `[G]` 9d817f6; `cookies-next` sigue en `package.json` |
| Lista global `/combat`, `Navbar` de 3 tabs | 08-25/26 | `[G]` 644114b, 9d817f6 |
| Del mockup de Stitch: estamina, condición persistente, resultado de combate de 3 vías, nav de 4 tabs | pre-código | `[D]` spec §4 dec.10, §8 D8/D9 |
| Acciones legendarias, inmunidades, salvaciones con recarga de monstruos → `notes` | 09-08 | `[D]` spec acciones §7b |
| Ticket G (bestiario navegable) | especificado 09-11, **no implementado** | `[D]`; sin ruta en `src/app` `[C]` |

---

## 5. Requirements reconstruidos

### 5.1 Funcionales

| ID | Requisito | Apareció | Cambió / tardío | Evidencia |
|---|---|---|---|---|
| FR-01 | Core de combate (iniciativa, HP, temp HP, CA, condiciones, log) | 05-03 | Estable; se movió a `domain/` en 08-14 | `[G]` |
| FR-02 | Plantillas + grupos CRUD, persistencia de HP | 05-16/17 | Re-scopeado a campaña 08-27 (`REWORK`) | `[G]` 189aa21 |
| FR-03 | Tiradas de muerte, concentración, descanso | 05-07/18 | Estable | `[G]` |
| FR-04 | Espectador con HP cualitativo | 05-22 | **Cambió el modelo de identidad** (cookie→membresía) 08-26 | `[G]` 9d817f6 |
| FR-05 | Campañas, roles, código de invitación | 08-24 | Nuevo; base de todo | `[D]` |
| FR-06 | Ciclo de cuenta (registro, verificación, reset, perfil) | 08-24→09-03 | Reset "sin definir" en Etapa 1 §6, resuelto 09-03 | `[D][G]` |
| FR-07 | Reordenar turnos a mano | 08-15 | Origen UNKNOWN; reusó la reubicación de `currentTurnIndex` en S2-9 | `[G]` |
| FR-08 | Ficha de personaje fuera de combate | Sprint 2 "a definir" | Alcance decidido **durante** implementación (solo lectura + notas) | `[D]` S2-6 |
| FR-09 | Unirse/agregar participante a mitad de combate | **implícito**; explicitado por la auditoría de `project-spec` | `addParticipant` daba `turnOrder: 0` | `[D]` S2-9 |
| FR-10 | Roster global de monstruos | Roadmap (planificado) | Modelo separado (Opción B) | `[D]` |
| FR-11 | Acciones guardadas + tirada guiada vs. CA | Sprint 3 (no en roadmap) | `uses` (09-08) y `economyType` (09-11) agregados **después** del diseño | `[D]` §4b/§7b |
| FR-12 | Economía de acción ↔ acción usada | Campos `actionUsed/bonusUsed/reactionUsed` desde 05-06; **vínculo con acciones recién 09-11** | Requisito tardío | `[G]` 01e660c vs de99151 |

### 5.2 No funcionales (los que más rework generaron)

| ID | Requisito | Cuándo se hizo explícito | Estado |
|---|---|---|---|
| NFR-01 | **Autorización en cada punto de entrada** (lectura, escritura, propiedad) | Lectura: 08-27 (D16). Escritura: 08-30 (S2-0). Propiedad: 08-31 (S2-6). Nulabilidad: 09-03. | Cada uno se descubrió *después* de entregar el anterior. Nunca fue un NFR del backlog de Sprint 1 (solo "no confiar solo en ocultar en UI", C5). |
| NFR-02 | App en español | 08-24 (decisión 12) | Incumplido en mensajes de error (project-spec 7.3, sigue igual `[D]`); logs de combate corregidos en S2-11 |
| NFR-03 | Sin tiempo real | 08-24 (explícito fuera de alcance) | Consecuencias: `window.location.reload()` en S2-9; estado hidratado una vez |
| NFR-04 | Verificabilidad (poder probar en navegador/DB) | 08-27 (E4 sin verificar) → 08-31 Playwright | E4 sigue abierto; auth no ejercitada en verificaciones de Sprint 3 |
| NFR-05 | **Seguridad de datos / respaldo / entornos separados** | **Nunca** antes del 09-16 | Sin backup; una sola DB; incidente (EV-16) |
| NFR-06 | Consistencia visual | 08-24 (`sistema-visual`) | Retokenizado en 08-25/26 (EV-08) |
| NFR-07 | Concurrencia | Declarado pendiente | No abordado |

---

## 6. Iteration / Rework Analysis

**Leyenda.** Tipo: `ITERATION` (refinamiento normal) · `REWORK` (rehacer por decisión/supuesto/implementación previa incorrecta, insuficiente o prematura) · `REFACTOR` (pago de deuda planificado). Cada evento agrupa commits; no se listan commits sueltos.

### Resumen

| Evento | Período | Tipo | Categorías | ¿Evitable? |
|---|---|---|---|---|
| EV-01 Reescritura del schema (día 0→1) | 05-03/04 | REWORK (menor) | `ARCHITECTURE DECISION` `REWORK` | Parcialmente; barato |
| EV-02 UI core de combate | 05-04→05-07 | ITERATION | `UI GAP` (sin diseño previo) | No; exploratorio |
| EV-03 Estado cliente `useOptimistic`→Zustand + recurrencia | 05-07→09-10 | **REWORK recurrente** | `ARCHITECTURE DECISION` `IMPLEMENTATION ERROR` | Parcialmente |
| EV-04 Espectador por `joinCode` + cookies | 05-22→08-26 | **REWORK** | `REQUIREMENTS GAP` `SCOPE UNCERTAINTY` `REWORK` | Sí (identidad es pregunta de primer orden) |
| EV-05 Stats: participante primero, plantilla después, campos fantasma | 06-05→09-01 | REWORK menor + error | `REQUIREMENTS GAP` `IMPLEMENTATION ERROR` | Sí |
| EV-06 Refactor de dominio | 08-14 | REFACTOR (legítimo) | `ARCHITECTURE DECISION` | — (pago de deuda de EV-03) |
| EV-07 Ciclo de diseño Stitch → spec | ~08-15→08-24 | ITERATION (legítima) | `UX GAP` `DISCOVERY GAP` (resueltos pre-código) | No; funcionó |
| EV-08 Sprint 1: scoping por campaña | 08-24→08-27 | **REWORK** | `DISCOVERY GAP` `UI GAP` `ARCHITECTURE DECISION` | Sí (superficie de impacto) |
| EV-09 Autorización lectura→escritura→propiedad | 08-27→09-03 | **REWORK** + hueco de seguridad | `REQUIREMENTS GAP` `IMPLEMENTATION ERROR` | Sí |
| EV-10 Turno actual y unirse a mitad de combate | 08-30/09-01 | REWORK menor | `REQUIREMENTS GAP` `DISCOVERY GAP` | Sí |
| EV-11 Pivote de verificación (Playwright, deadlock) | 08-31→09-03 | ITERATION forzada | `TECHNICAL UNCERTAINTY` `EXTERNAL DEPENDENCY` | Parcial |
| EV-12 Sprint 3: `templateId` nullable | 09-03→09-08 | **REWORK** (3 resoluciones) | `ARCHITECTURE DECISION` `DISCOVERY GAP` | Sí |
| EV-13 Adendas: `uses`, `economyType`, G, H | 09-08→09-11 | ITERATION con `REQUIREMENTS GAP` | `REQUIREMENTS GAP` `DISCOVERY GAP` | Parcialmente |
| EV-14 F→H→hook (duplicar y extraer) | 09-11→09-13 | REWORK planificado en 2 pasos | `IMPLEMENTATION ERROR` (supuesto de spec) | Sí |
| EV-15 Implementación duplicada en dos copias | 09-10 | REWORK (trabajo descartado) | `UNKNOWN` (proceso) | UNKNOWN |
| EV-16 Incidente de datos | 09-15→09-17 | Incidente | `EXTERNAL DEPENDENCY`/`UNKNOWN` | UNKNOWN |

---

### EV-01 — Reescritura del schema (05-03 → 05-04)

- **Construido:** schema inicial (`b630c4c`) con `AppState`, `RollMode`, `LogType{ATTACK,EFFECT}`, `stats/abilities/source` como JSON, `Group/GroupMember`.
- **Motivo/cambio:** al día siguiente `126e8b2` aplica la migración `rewrite_mvp_schema`: elimina `AppState`, `Group`, `CombatLog.{rollMode,rollValue,description,participantId}`, columnas `stats/abilities/source/updatedAt`, `LogType` pasa a `{DAMAGE,HEAL,CONDITION_*,NOTE}`, agrega `SETUP` y `currentTurnIndex`. `Group/GroupMember` se **recrean el 05-17** (`5dcf6c4`).
- **Afectó:** solo schema + primeras pantallas (todo tenía 1–2 días).
- **Tipo:** REWORK menor, temprano. **Causa probable:** schema diseñado para una visión amplia (rolls automáticos, estado global) antes de definir el MVP `[I]`.
- **¿Detectable antes?** Sí en parte: la propia migración se llama "rewrite_mvp_schema" — el MVP se definió *después* del primer schema. **Artefacto:** una definición de MVP de una página antes del primer `prisma migrate`.
- **Costo:** bajo (dev DB, datos descartables; la migración advierte pérdida de columnas).

### EV-02 — UI core de combate (05-04 → 05-07)

- **Construido:** `CombatRow`: 5 commits entre 05-04 y 05-07 (283→337→275→422 líneas de archivo; diffs de 173 a 524 líneas por commit), `CurrentTurnPanel` "floating bar", daño/curación, death saves.
- **Tipo:** ITERATION legítima: exploración sobre dominio conocido, sin spec `[I]`. `CombatRow.tsx` acumula **22 commits** (13 en mayo) — el archivo más modificado del repo.
- **Nota que sí es un hallazgo:** `CurrentTurnPanel` (05-06) **duplicó** los controles de daño/curación/objetivo de `CombatRow`. Esa duplicación nunca se decidió como diseño; reaparece como problema en EV-14 (H: "dos caminos distintos para aplicar daño").
- **Categoría:** `UX GAP` — dos superficies para la misma acción, sin decisión de cuál es canónica. **Evidencia:** `[G]` 8c45fad; `[D]` spec acciones §10.

### EV-03 — Estado cliente: `useOptimistic` → Zustand + fricción recurrente (05-07 → 09-10)

- **Cronología:** `43afd71` (05-07) agrega `useOptimistic` local en `CombatRow` → `9ecb80a` (05-12) introduce Zustand + `useCombatMutation` → 5 commits de "fixing store/rendering/type export" (05-13→05-15) → `3a41027` hidratación (05-31) → `5400ba1` re-renders (07-16) → `083c105` bug `router.refresh()` vs store hidratado una sola vez (09-01, se resuelve con `window.location.reload()`) → `d05360a` (09-10) documenta "dependencia implícita de hidratación".
- **Causa:** una vez que dos componentes (`CombatRow`, `CurrentTurnPanel`) mutan lo mismo, el estado local no alcanza — el cambio a store era previsible desde EV-02 `[I]`. El modelo "hidratar una vez por `combatId`" sigue generando bugs y **bloqueó la verificación sin navegador** (E3/E4: el HTML sin JS muestra el store vacío `[D]`).
- **Tipo:** REWORK (decisión de arquitectura tomada a mitad de implementación) + costo recurrente. Antes del 08-14, 19 de 40 asuntos de commit contienen fix/bug/hydrat/render (~48%; conteo grueso por palabra clave `[R]`).
- **¿Evitable?** Parcialmente. El paso a store era natural; el costo recurrente proviene del contrato de hidratación no documentado.
- **Artefacto que lo habría detectado:** mapa de flujo de datos (quién muta qué, dónde vive el estado) al aparecer el segundo panel de mutación.

### EV-04 — Espectador por `joinCode` + cookies → membresía (05-22 → 08-26)

- **Construido:** `c9a5a8e` "Working on auth and multiplayer views": `/join` con `joinCode`, `/combat/[id]/spectate`, `SpectateView`, `cookies-next`, `Combat.joinCode/isPublic`.
- **Hecho:** **no hay auth** en ese commit (no existe `User` hasta 08-24). "Quién es un jugador" se resolvió por cookies.
- **Reemplazo:** `644114b` (08-25) reemplaza `/join` "en la misma ruta"; `9d817f6` (08-26) reescribe la autorización de `/spectate` para no depender de las cookies muertas.
- **Residuo hoy `[C][R]`:** `Combat.joinCode`, `isPublic`, `generateJoinCode()` (se sigue generando en cada `startCombat`, `combat.ts:282`), `getCombatByJoinCode*`, `cookies-next` en `package.json`, comentarios de andamiaje en `schema.prisma` ("← add this", "not yet updated in this pass"), archivo cero-bytes `prismaschema.prisma:107` rastreado.
- **Tipo:** REWORK. `REQUIREMENTS GAP` + `SCOPE UNCERTAINTY` (qué era "multijugador" en mayo: UNKNOWN).
- **¿Detectable antes?** Sí: identidad/tenencia es una pregunta de primer orden para una vista multijugador; construir la vista antes de decidir cómo se identifica al jugador garantiza rehacerla.
- **Artefacto:** definición de actores y su identificación (quién es DM/jugador/espectador y cómo se prueba).

### EV-05 — Stats: participante primero, plantilla después, campos fantasma (06-05 → 09-01)

- **Secuencia `[G]`:** migración `20260605…add_abilities_scores` agrega level/prof/STR…/speed/hitDice a **`CombatParticipant`** (commiteada recién el 07-16) → migración `20260721…add_template_abilities` agrega lo mismo a **`CharacterTemplate`** (commiteada el 08-15, `8413277`, con inputs de formulario) → D15 (08-26) copia stats template→participante → **S2-8 (09-01)** descubre que `createTemplate/updateTemplate` **descartaban en silencio** esos campos.
- **Observaciones:** (a) las fechas de las migraciones (06-05, 07-21) preceden a los commits en 41 y 25 días → trabajo local sin commitear durante semanas `[I]`; (b) los campos existieron en UI 17 días sin persistir.
- **Tipo:** modelo agregado en el orden inverso al flujo de datos (`REQUIREMENTS GAP`) + `IMPLEMENTATION ERROR` (inputs sin cablear; el propio S2-8 aclara "no es regresión de Sprint 1").
- **¿Detectable?** Sí: un criterio de aceptación "guardar → recargar → el valor persiste" lo habría atrapado en el commit `8413277`.

### EV-06 — Refactor de dominio (08-14)

- **Hecho:** `0f149c8` — extrae `domain/combat/{rules,selectors,types}`, consolida "5 queries de Prisma duplicadas" y el mapeo Prisma→store; "reimplementado en tres lugares". 32 archivos, 519+/524−, "sin cambios funcionales", verificado con tsc/build.
- **Tipo:** REFACTOR legítimo, hecho *antes* del cambio grande (campañas). Es la mejor decisión de proceso del proyecto.
- **Límite:** la consolidación fue **incompleta** — `spectate/page.tsx` conservó un cálculo propio de turno con el comentario "pre-existing behavior, kept as-is" (`[G]` diff de 6d5d25b), que reventó como S2-12 (EV-10). La deuda estaba marcada, no tratada.

### EV-07 — Ciclo de diseño (Stitch) → spec (≈08-15 → 08-24)

- **Evidencia disponible `[D]`:** dos rondas de addenda sobre Stitch (`addendum-correcciones`, `addendum-v2-funcional`; **no están en el repo**), consolidadas en `spec-tecnico-etapa-1.md`. `project-spec.md` (versión inicial 152 líneas, commit 7264d49) sirvió de "documento de referencia para diseño UX/UI" `[D]`.
- **Errores capturados en diseño (costo de código ≈ 0):** dec. 6 revisada (hub por rol), dec. 10 (Stitch propuso 4 tabs globales), dec. 9 (nombre placeholder), D8/D9 (mockup con estamina/condición persistente/resultado 3 vías sin respaldo en schema), §7 (bloque "Acciones" adelantado por Stitch).
- **Tipo:** ITERATION legítima y **bien ubicada** (antes del código). Es el mejor ejemplo del proyecto de una iteración barata.
- **Categorías:** `UX GAP`, `DISCOVERY GAP` (la herramienta de diseño inventa campos que el modelo no tiene) — resueltos pre-implementación.
- **Pérdida:** los artefactos y la traza de decisiones (mockups, addenda) no están versionados → `DOCUMENTATION DRIFT` de trazabilidad. Cantidad de iteraciones, tiempo y costo: UNKNOWN (P4).

### EV-08 — Sprint 1: scoping por campaña (08-24 → 08-27)

- **Ejecución `[G]`:** 4 commits en 4 días: `7264d49` (25 archivos, 6 migraciones + auth + docs, todo en un commit "Adding features"), `644114b` (26 archivos), `9d817f6` (35 archivos), `189aa21` (29 archivos, 857+/805−).
- **Hallazgos emergentes durante el sprint `[D]`:** D13 ("hueco real del plan original": 6 rutas quedaron con estilos viejos), D14 (`Nuevo combate` sin wireframe, §6 lo declaraba pendiente), D15 (links muertos, stats no copiados), **D16** (crítico: crear personaje/grupo *fallaba siempre* con `Missing campaignId`, y `getTemplates()/getGroups()` sin scope mezclaban campañas).
- **Causa:** A4–A6 migraron el modelo (campaignId NOT NULL) pero el backlog **no tenía tickets para los consumidores** de esas entidades (rutas planas, queries sin scope, pantallas de setup). La superficie de impacto se descubrió andando: D13 → D16 → 29 archivos movidos.
- **Tipo:** REWORK (rutas movidas, pantallas retokenizadas dos veces si se cuentan las de mayo–agosto) sobre una decisión **correcta y bien validada** (campaña como raíz). Categorías: `DISCOVERY GAP`, `UI GAP` (sistema visual definido 08-24 tras ~3 meses de UI sin tokens), `ARCHITECTURE DECISION` (impacto no enumerado).
- **¿Detectable antes?** Sí: bastaba enumerar "qué archivos leen `Combat/CharacterTemplate/Group`" — `grep` de 5 minutos.
- **Artefacto:** inventario de consumidores de cada entidad que cambia de scope, dentro del backlog.
- **Nota — costo bien contenido:** la decisión de fondo no se revirtió; el rework fue de propagación, no de concepto.

### EV-09 — Autorización: lectura → escritura → propiedad (08-27 → 09-03)

- **Secuencia `[G][D]`:** D16 (08-27) descubre que un guard solo en `layout.tsx` no cubre el `page.tsx` en paralelo (datos ajenos en el payload RSC) → regla "guard en cada `page.tsx`". **S2-0 (08-30, `b722f28`)** descubre que las Server Actions de combate/participantes/templates/grupos **no importaban `auth()`**: cualquiera con un id podía mutar. → **S2-6 (08-31)** necesita un criterio distinto (`requireTemplateOwner`: ser DM no alcanza). → **Sprint 3 (09-03)** `requireParticipantAccess` debe null-guardear `templateId`.
- **Causa:** la regla de D16 se formuló como regla de *lectura*; nunca se enumeró la matriz (recurso × operación × rol). El hallazgo de escritura vino de **regenerar `project-spec.md`** (mecanismo de auditoría posterior), no del diseño ni de un test.
- **Tipo:** `REQUIREMENTS GAP` (NFR de autorización no especificado) + `IMPLEMENTATION ERROR` (Sprint 1 entregó "auth de campañas" con agujero de escritura; el backlog C5 ya decía "no confiar solo en ocultar en UI" — se aplicó a la API de lectura, no a las Actions). S2-0 lo califica "agujero de seguridad activo en una app ya desplegada".
- **Superficie exacta del fix S2-0 (archivos) `[G]`:** `src/lib/auth/action-guards.ts` (nuevo), `src/lib/actions/combat.ts` (9 funciones), `participant.ts` (daño/curación/condiciones/muerte/PV temp/CA/toggles/reorden), `templates.ts`, `groups.ts`, `src/app/combat/[id]/setup/page.tsx`. Además `character.ts` (S2-6, `requireTemplateOwner`), `templateActions.ts` (Sprint 3, guard DM por campaña).
- **¿Detectable antes?** Sí. **Artefacto:** matriz de autorización como NFR del sprint.
- **Persistencia del riesgo hoy `[D][C]`:** el enforcement queda repartido en 5 capas (proxy, layouts, `page.tsx`, Route Handlers inline, `action-guards.ts`); project-spec 7.12 lo reconoce. **No hay ningún test de los guards** (§13). Las verificaciones de Sprint 3 **no ejercitaron `auth()`** (limitación registrada en el spec, §11).

### EV-10 — Turno actual y unirse a mitad de combate (08-30 → 09-01)

- **S2-12 (`6d5d25b`):** tres implementaciones de "de quién es el turno": panel DM y store (`computeCurrentActor`), `/spectate` (filtro `isConscious`) y hub (índice crudo). Con un caído-no-muerto resaltaban a personas distintas. La regla "inconsciente-no-muerto conserva su turno (ese turno tira la salvación)" **ya estaba** en `rules.ts` pero nunca se había escrito como decisión; el propio backlog dice "hay que definir la regla primero". 4 archivos, 28+/12−.
- **S2-9 (`083c105`):** `addParticipant` mid-combat creaba `turnOrder: 0` (colisión con quien va primero) y sin UI para corregirlo; extrae `computeTurnOrder`, agrega `setParticipantInitiative`, y descubre el bug de hidratación (EV-03). 8 archivos, 325+/37−.
- **Tipo:** `REQUIREMENTS GAP` (reglas de dominio no escritas) + `DISCOVERY GAP`. Ambas eran "situación común en mesa" y salieron de auditar el código, no de recorrer un escenario de juego.
- **Residuo `[C][R]`:** `addParticipantsFromGroup` sigue con `turnOrder: 0` (`combat.ts:536`, project-spec 7.11 vigente).
- **Reacción de proceso:** `f1a4685` (09-10) agrega a `CLAUDE.md` el formato de reporte que exige listar *cada* archivo cuando se toca una función compartida — control creado en respuesta a estos hallazgos `[I]`.

### EV-11 — Pivote de verificación (08-31 → 09-03)

- **Problema:** E4 y varios cierres quedan "sin verificar en vivo — extensión de Chrome no conectada" `[D]`.
- **Respuesta:** Playwright (3 specs) + Impeccable (auditor de UI) — "fuera del backlog original". Al escribir `updateCampaign` el patrón "Server Action que hace `fetch` a su propia route" **deadlockeó el dev server** bajo e2e → se abandonó parcialmente (project-spec 7.5/7.6: `PATCH /api/campaigns/[id]` sin consumidor; dos features gemelas con dos arquitecturas).
- **Tipo:** ITERATION forzada por dependencia externa (`TECHNICAL UNCERTAINTY` + `EXTERNAL DEPENDENCY`). **Costo residual:** arquitectura inconsistente y cobertura e2e limitada a lo que era alcanzable sin extender fixtures (S2-6 y S2-9 sin e2e por eso).
- **Nota de trazabilidad `[G]`:** `9fa1e7f` "Changes" (08-31) — 178 archivos, 74.6k líneas — agrupa en un commit **sin mensaje** los tickets S2-1, S2-2, S2-3, S2-4 y S2-7 completos (header, logout, editar campaña, chip de invitación, `/profile`), más Playwright, la skill Impeccable versionada y la bitácora. También contiene el cambio a `package.json` que después desincronizó `node_modules` (`npm ci` necesario en S2-6). La única traza de decisión de esos 5 tickets es la bitácora del spec, no el historial de git (mismo patrón que `7264d49` "Adding features" del 08-24, que junta 6 migraciones + auth + docs).

### EV-12 — Sprint 3: `templateId` nullable (09-03 → 09-08)

- **Decisión `[D]`:** modelo separado `MonsterTemplate` (Opción B), con motivación explícita: evitar el patrón de bug de D16. `CombatParticipant.templateId` → opcional + `monsterTemplateId`. El spec identifica **un** efecto colateral (`requireParticipantAccess`).
- **Realidad `[G]`:** `3d26edb` deja **`tsc`/`build` rotos** en `main` ("Known, reported, deliberately NOT fixed") por el clúster `types.ts` / `mappers/combat.ts` / `CombatRow` / `SpectateView` / `combatStore` / `spectate/page` / `setup/page` / `startCombat` / `saveHpToTemplates`. `2c554bf` (09-04) lo corrige haciendo `template` nullable en tipos; `c8b939a` (09-08) **cambia otra vez la solución**: un template sintético `type: MONSTER` en el mapper "para no meter null-checks en cada sitio". Tres resoluciones de la misma forma en 5 días. `d05360a` deja documentado que el store *depende* de hidratarse desde el mapper (frágil si cambia).
- **Tipo:** REWORK dentro del sprint; `ARCHITECTURE DECISION` (superficie de impacto subestimada: 1 efecto listado vs. ≥9 archivos tocados) + `DISCOVERY GAP`.
- **Contra-mérito:** el desarrollador **eligió parar y reportar** en lugar de forzar un null-check de emergencia (decisión explícita de no arreglar la forma sin decidir la forma). `main` estuvo sin tsc/build ~1 día.
- **Artefacto:** el mismo inventario de consumidores de EV-08.

### EV-13 — Adendas de Sprint 3: `uses`, `economyType`, G, H (09-08 → 09-11)

- **`uses` (`a578095`):** "surgió al armar el seed" un dragón adulto; agrega `TemplateAction.uses` cinco días después de crear `TemplateAction` (`3d26edb`). Además fija una regla buena (§7b: *un campo estructurado nuevo necesita un consumidor mecánico ya planeado*).
- **`economyType` (`de99151`):** "surgió probando la app": las acciones no distinguían Acción/Bono/Reacción y quedaban desconectadas de `actionUsed/bonusUsed/reactionUsed`, que **existen desde 05-06**. Requiere migración, cambios al CRUD (recién escrito en `a2e0adc`), al seed y al selector.
- **G (bestiario navegable)** e **H (extender el flujo a `CurrentTurnPanel`)** salieron "de la misma pasada de feedback" / "al cerrar F".
- **Tipo:** en conjunto ITERATION legítima (feedback de uso real → ajuste), **con** un `REQUIREMENTS GAP` identificable: el vínculo economía-de-acción ↔ acciones podía deducirse leyendo el modelo existente. Costo: migraciones aditivas con default (baratas) + un segundo pase por el CRUD y el seed (horas).
- **¿Detectable antes?** `economyType` sí (recorrido del modelo de `CombatParticipant`); `uses` probablemente (revisar stat blocks reales antes de fijar el schema).

### EV-14 — F → H → hook (09-11 → 09-13)

- **F (`0724a6b`):** el flujo guiado vive en `CombatRow`, con `GuidedActionPanel` **solo presentacional**. **H (`54c2c36`):** el spec pedía "reusar `GuidedActionPanel.tsx` tal cual"; como el estado y la matemática estaban en el host, se **duplicaron 189 líneas** en `CurrentTurnPanel`. **`8530a1a`:** se extrae `useGuidedAction` (227+/254−) el mismo día.
- **Tipo:** REWORK deliberado y registrado ("quedó revertida en el siguiente commit, dejada como parte de la historia"). Causa: **supuesto del spec §10 inválido** (el panel presentacional no contiene la lógica que se quería reusar), verificable leyendo F antes de especificar H.
- **Raíz más profunda:** EV-02 (dos superficies duplicadas desde mayo).
- **Cierre `[D]`:** el hook **no** se probó como hook de React (solo tsc/build/ESLint + revisión manual); verificaciones por scripts Prisma que replican la lógica.

### EV-15 — Implementación duplicada en dos copias (09-10)

- **Evidencia `[G]`:** `de48cde` (09-10 23:25 -03) implementa `economyType` **y** el CRUD de acciones (`TemplateActionsSection.tsx` 392 líneas, `templateActions.ts` 199) sobre `a578095`, **sin** `a2e0adc` (autor 09-08, que ya escribía ese mismo CRUD y que `origin/main` contenía cuando se hizo el reset posterior). El reflog muestra `reset: moving to origin/main` y `de99151` (09-11 00:20) rehace `economyType` sobre `a2e0adc`; `de48cde` sobrevive solo en la rama `backup-fork-e-economytype`.
- **Contexto:** dos identidades de autor (`Gonzalo Murua` 63 commits / `gonzaloPukiMurua` 18, mismo email) y trailers de 14 sesiones de Claude Code en la web → trabajo en al menos dos entornos `[I]`.
- **Tipo:** trabajo descartado por divergencia de copias de trabajo. Causa: UNKNOWN (P7). Costo: ~1 pase de implementación.
- **Antecedentes del mismo patrón:** merge `fa27fd8` (08-20) tras trabajo paralelo sobre `schema.prisma` (`a968845` vs `8413277`); backups `backup-local-20260831`.

### EV-16 — Incidente de pérdida de datos (09-15 → 09-17)

Ver §9 (evidencia propia). Resumen: relato oficial = todas las tablas de app en 0, causa desconocida, no se encontró comando destructivo en 13 sesiones; salvaguarda agregada a `CLAUDE.md`. **Esta auditoría encontró evidencia en la DB y en los logs que el relato no explica.**

---

## 7. Decisiones de alto impacto

Reversibilidad: LOW / MEDIUM / HIGH. *Validada pre-implementación* = revisada en spec/diseño antes de código.

| # | Decisión (cuándo) | Reversib. | Superficie de impacto | Validada antes | ¿Cambió? / costo | Estado |
|---|---|---|---|---|---|---|
| D-01 | Schema día 0 con estado global y rolls automáticos (05-03) | MEDIUM | schema, 2 pantallas | No | Sí, al día siguiente (EV-01); bajo | Superada |
| D-02 | Estado cliente en Zustand, hidratado una vez, optimista (05-12) | MEDIUM–HIGH | `combatStore`, `useCombatMutation`, `CombatView`, paneles, `AddParticipantMidCombat`, mapper | No | No cambió; fricción recurrente (EV-03) | Vigente |
| D-03 | Identidad por cookie + `joinCode` (05-22) | MEDIUM | `/join`, `/spectate`, schema (`joinCode`) | No | Reemplazada (EV-04) | Superada; residuos |
| D-04 | Reglas de combate a `domain/` (08-14) | MEDIUM | store, actions, componentes | Sí (refactor puro) | Incompleta (EV-10) | Vigente; positiva |
| D-05 | **Campaña como raíz de scope; `campaignId NOT NULL` en Combat/Template/Group (08-24)** | **HIGH** | 6 migraciones, ~90 archivos-tocados en 3 commits (644114b/9d817f6/189aa21), rutas, guards, hub, API, e2e seed | **Sí** (spec + Stitch) | Concepto no cambió; propagación descubierta andando (EV-08) | Vigente |
| D-06 | Identidad = cuenta + email verificado (08-24) | HIGH | auth, `/join`, guards, JWT | Sí | No | Vigente |
| D-07 | Autorización distribuida en 5 capas (08-27→08-30) | **HIGH** (por-convención) | cada page/route/action futura | No (emergió) | Ampliada 3 veces (EV-09) | Vigente; **sin tests** |
| D-08 | Combate en rutas planas `/combat/*` fuera de `/campaigns/[id]` (Etapa 1 dec. 8 + D14) | MEDIUM | 3 pantallas, proxy fuera de matcher, guards propios | Parcial | No | Vigente; riesgo por convención |
| D-09 | Páginas que llaman a su propia API por HTTP (`getBaseUrl`) (Etapa 1) | MEDIUM | `/campaigns`, hub, `/join/character`, `/profile` | Sí ("fuente única") | Abandonado parcialmente (deadlock, EV-11) | Inconsistente |
| D-10 | JWT sin refresco (08-24) | MEDIUM | nombre en header, `emailVerified` (lee DB) | Reconocida | Limitación documentada (7.7) | Vigente |
| D-11 | `MonsterTemplate` separado + `templateId` nullable (09-03) | **HIGH** | ≥9 archivos, 3 soluciones (EV-12) | Sí (opciones A/B) | Forma re-resuelta 2 veces | Vigente |
| D-12 | `TemplateAction` tabla propia, no snapshot; leídas en vivo (09-03) | MEDIUM | CRUD, seed, mapper, flujo guiado | Sí | `uses`, `economyType` agregados después | Vigente |
| D-13 | Una sola base Supabase para dev/e2e/verificación/migraciones | **HIGH** (irreversible tras pérdida) | todo el flujo de trabajo | **Nunca evaluada** | Incidente EV-16 | Vigente |
| D-14 | Sistema visual único "sole theme" (08-25) | MEDIUM | todas las pantallas, retokenizado en 08-25/26 | Sí (Stitch) | No | Vigente |

---

## 8. Bloqueos

| ID | Blocker | Tipo | Apareció | Intentaba | Causa | Duración | Trabajo bloqueado | ¿Detectable antes? | Categoría |
|---|---|---|---|---|---|---|---|---|---|
| B-01 | Migración `campaignId NOT NULL` sobre tablas con datos | technical | 08-24 | Épica A | Advertencia en el SQL generado ("no es posible si la tabla no está vacía") | ≤ 1 día `[I]` | A4–A6 | Sí (estaba en la nota de A4) | `TECHNICAL UNCERTAINTY` |
| B-02 | Navegador/extensión de Chrome no disponible | external dependency | 08-27 (E4) → 09-08 (E: "extensión offline") | Verificar UI en vivo | Herramienta | 12+ días, **E4 sigue abierto** | Cierres de E3/E4, S2-5 envío real, auth en Sprint 3 | Sí | `EXTERNAL DEPENDENCY` |
| B-03 | Deadlock del dev server (self-`fetch` de Server Action) | technical | 08-31 (S2-3) | Correr e2e | Pool de workers agotado por fetch al mismo origen | horas | S2-3 | No (emergente) | `TECHNICAL UNCERTAINTY` |
| B-04 | `main` con `tsc/build` rotos | technical (por decisión) | 09-03 → 09-04 | Sprint 3 modelo de datos | `templateId` nullable (EV-12) | ~1 día | Build/deploy de `main` | Sí | `ARCHITECTURE DECISION` |
| B-05 | Timeouts del pooler de Supabase (`P1001`/proceso colgado) | external dependency | 09-11→09-13 | Limpieza de scripts de verificación | Pooler | Intermitente | Verificaciones de F y hook | No | `EXTERNAL DEPENDENCY` |
| B-06 | Regla de turno indefinida | decision | 08-30 | S2-12 | La regla no estaba escrita ("hay que definir la regla primero") | horas | S2-12 | Sí | `REQUIREMENTS GAP` |
| B-07 | Alcance de S2-6 "a definir", "Nuevo combate" sin wireframe, "finalizar campaña" sin decisión | decision | 08-24 / Sprint 2 | D14, S2-6 | Decisión de producto pendiente | S2-6/D14: resueltos en la misma sesión; "finalizar campaña": abierto | S2-6, D14 | Sí (estaban declarados) | `SCOPE UNCERTAINTY` |
| B-08 | Mockups con campos sin respaldo en el modelo | missing information | pre-08-24 | D8/D9 | Stitch inventó datos | UNKNOWN | D8/D9 | Sí | `DISCOVERY GAP` |
| B-09 | Copias de trabajo divergentes | technical/proceso | 08-20, 09-10 | Integrar | Trabajo paralelo en ≥2 entornos | horas | EV-15 | UNKNOWN | `UNKNOWN` |
| B-10 | Pérdida de datos / FK P2003 al crear campaña | external dependency (`UNKNOWN`) | detectado 09-15 20:45 (-03) | Crear campaña | Usuario de sesión JWT inexistente en DB | ≥ 2 días hasta re-sembrar (09-17) | Todo el flujo con datos | No | `UNKNOWN` |
| B-11 | `_prisma_migrations` inexistente | technical | detectado en `[R]` hoy | `migrate deploy` (README) | DB sin historial | abierto | Cualquier `migrate` futuro (P3005) | Sí | `TECHNICAL UNCERTAINTY` |

---

## 9. Incidente de datos — evidencia adicional (verificada, causa UNKNOWN)

Fuente del relato oficial: `docs/etapa-3/spec-tecnico-etapa-3-acciones-tiradas.md` §11 "Incidente" y `aa76c5a`. **Esta sección no atribuye causa.**

### 9.1 Hechos `[R]` (SELECTs contra `aws-1-us-west-2.pooler.supabase.com:6543/postgres`)

| Hecho | Resultado |
|---|---|
| Conteos actuales | User 1 · Campaign 1 · CampaignMember 1 · CharacterTemplate 4 · Combat 1 · CombatParticipant 0 · CombatLog 0 · Group 0 · GroupMember 0 · MonsterTemplate 9 · TemplateAction 16 |
| `createdAt` de User / Campaign / CharacterTemplate / Combat / CampaignMember | **todos 2026-09-17 03:30–03:38 UTC** (post-incidente): no sobrevivió ningún dato de app previo |
| `createdAt` de `MonsterTemplate` | **2026-09-11 03:16:08–03:16:38 UTC** (00:16 -03 del 09-11) |
| `to_regclass('public._prisma_migrations')` | **`null`** — la tabla de historial de migraciones no existe |
| Columnas | `TemplateAction.{uses,economyType}`, `CharacterTemplate.{notes,level,exhaustionLevel}`, `CombatParticipant.{templateId,monsterTemplateId}` nullable → el schema físico coincide con el último estado del código |
| `supabase_logs.json` (sin trackear) `[R]` | 2026-09-15 23:45:20 UTC `23503` FK `Campaign_ownerId_fkey`; 2026-09-16 01:34:54 UTC `42P01 relation "_prisma_migrations" does not exist`; 2026-09-16 02:35–02:36 UTC consultas de conteo desde el dashboard |

### 9.2 Inconsistencias con el relato oficial

1. **"MonsterTemplate y TemplateAction sobrevivieron porque el seed se re-corrió después del vaciado"** (relato). Si se hubieran re-sembrado tras el vaciado del 09-15, su `createdAt` sería ≥ 09-15; es **09-11 00:16 -03**. Además `a578095` (09-08 11:39 -03) reporta haber sembrado 9+16 filas "contra la DB real": esas filas ya **no existen** (un upsert conserva `createdAt`). Es decir, las filas de monstruos se **crearon de nuevo** el 09-11, cuatro minutos antes del commit `de99151`. Algo dejó vacía (o distinta) esa DB entre el 09-08 y el 09-11.
2. **`_prisma_migrations` ausente.** Un `migrate reset` recrearía esa tabla; su ausencia no es compatible con un `migrate reset` limpio como último evento. Es compatible con: `db push` (incl. `--force-reset`/`--accept-data-loss`), SQL manual o recreación desde el panel, o un evento del lado de Supabase. **Esta auditoría no puede discriminar entre ellas.**
3. **El P2003 del 09-15 es la detección, no el evento.** La sesión es JWT sin refresco (project-spec 7.7): un usuario borrado seguiría "logueado" hasta que una escritura choque con la FK. El vaciado pudo ocurrir en cualquier momento entre la última operación exitosa y el 09-15 20:45 -03.
4. **Cobertura de la investigación:** el relato revisó "13 sesiones de Claude Code"; los commits llevan trailers de **14** sesiones `claude.ai/code/session_*` (espacio de IDs distinto al de transcripts locales) y en al menos una (`a578095`) se ejecutó código contra la "DB real". Si las sesiones web estaban dentro de esas 13 no puede determinarse desde el repo. Lo ocurrido **fuera** de sesiones (terminal manual, SQL Editor de Supabase) el propio relato lo deja como hipótesis abierta, sin evidencia que la confirme ni la descarte.
5. **Entorno:** `DATABASE_URL` y `DIRECT_URL` apuntan al **mismo** pooler/db; el seed de e2e, los scripts de verificación de Sprint 3 ("script temporal + cleanup"), `migrate dev`, `seed:monsters` y el desarrollo comparten esa base. El relato no menciona cuál copia de trabajo apuntaba a qué DB.

### 9.3 Qué NO se puede concluir

Ni quién ni qué ejecutó el vaciado, ni cuándo. Las tres ventanas plausibles y no excluyentes son: (a) ≈ 09-08→09-11 (según `MonsterTemplate.createdAt`), (b) ≤ 09-15 (según el P2003), (c) un evento de infraestructura. **UNKNOWN** — ver P8 en §15.

---

## 10. Iteraciones legítimas vs. evitables (Q6)

**Legítimas / normales (no son problema):** EV-02 (UI exploratoria), EV-06 (refactor previo al cambio grande), EV-07 (iteración en herramienta de diseño), EV-11 (respuesta razonable a una restricción de herramienta), la mayoría de EV-13 (feedback de uso → ajuste aditivo con defaults).

**Evitables (con costo y causa identificables):**

| Evento | Costo observable | Por qué era evitable |
|---|---|---|
| EV-04 espectador por cookie | 2 pantallas rehechas + residuos permanentes | Identidad no definida antes de construir la vista |
| EV-08 propagación de campaña | 29+35+26 archivos tocados en 3 commits; D13/D15/D16 | Sin inventario de consumidores |
| EV-09 autorización en 3 pasadas | S2-0 (≥6 archivos) + S2-6 + null-guard; **ventana de exposición real** | NFR de autorización no enumerado |
| EV-12 `templateId` nullable | 3 resoluciones, `main` roto ~1 día | 1 efecto listado vs. ≥9 reales |
| EV-14 duplicar y extraer | 189 líneas duplicadas + 227/254 de refactor | Supuesto de reuso no verificado contra F |
| EV-05 campos fantasma | 17 días de UI mintiendo | Sin criterio "persiste tras recargar" |
| EV-15 doble implementación | 1 pase descartado | Proceso de copias de trabajo |

**Mixtas:** EV-01 y EV-03 (parte inevitable, parte evitable); EV-10 (regla escrita tarde, corrección barata).

---

## 11. Problemas de requirements/scope/product vs. técnicos (Q8)

| Origen | Eventos |
|---|---|
| **Requirements / dominio** (reglas no escritas) | EV-10 (turno, mid-combat), EV-13 (`economyType`, `uses`), EV-05 (persistencia esperada) |
| **Requirements transversales** (NFR) | EV-09 (autorización), NFR-05 (seguridad de datos) |
| **Scope / product** | EV-04 (identidad), §4.3 (pendientes declarados), §4.4 (Sprint 3 vs. roadmap) |
| **Impacto de decisión de arquitectura** (no de "qué construir") | EV-08, EV-12 |
| **UX/UI** | EV-02→EV-14 (dos superficies para la misma acción), EV-07/08 (sistema visual y nav tardíos) |
| **Puramente técnicos** | EV-03 (hidratación), EV-11 (deadlock), B-03, B-05, `9fa1e7f`/`npm ci`, deuda de `page.tsx`/proxy |
| **Proceso/entorno** | EV-15, EV-16, D-13, B-02 |

**Lectura:** la mayoría del rework evitable **no** nace de que el producto estuviera mal definido, sino de (i) requisitos *transversales* nunca escritos y (ii) impacto de decisiones no enumerado.

---

## 12. Q7 — Qué información faltaba al iniciar cada implementación

| Implementación | Información que faltaba | Cuándo apareció |
|---|---|---|
| Vista de espectador (05-22) | Cómo se identifica a un jugador | 08-24 |
| Migración de scope (A4–A6) | Lista de consumidores de `Combat/CharacterTemplate/Group` | Durante D13 (08-26/27) |
| Auth de Sprint 1 | Matriz recurso×operación×rol (escritura, propiedad) | 08-30 / 08-31 |
| Cálculo de turno | Regla para inconsciente-no-muerto | 08-30 |
| `addParticipant` | Comportamiento mid-combat | 09-01 |
| Modelo de monstruos | Consumidores de `participant.template` | 09-03 (build roto) |
| `TemplateAction` | Multiataque y tipo de economía | 09-08 / 09-11 |
| Flujo H | Dónde vive el estado del flujo guiado | 09-13 |
| Entorno de DB | Que no hay backup ni separación de entornos | 09-15 |

---

## 13. Documentación → código → tests → git: inconsistencias

### 13.1 `DOCUMENTATION DRIFT` (verificado)

| # | Documento | Afirmación | Realidad | Evidencia |
|---|---|---|---|---|
| DD-01 | `project-spec.md` | "Estado actual… post Sprint 2 … todos cerrados **salvo S2-5**"; §6 "S2-5 no implementada" | S2-5 implementado en `84a8a4a` (09-03), 2 días después de regenerar el doc (`e7b4271`, 09-01) | `[G]` |
| DD-02 | `project-spec.md` §1 | "15 migraciones" | 19 en `prisma/migrations` (añadidas: monstruos ×3, `economyType`, etc.) | `[R]` |
| DD-03 | `project-spec.md` §4 | "No hay generación de números aleatorios… no hay tirada de ataque vs AC" | Existen `domain/dice/roll.ts` y el flujo guiado de ataque vs. CA | `[C]` |
| DD-04 | `project-spec.md` §7.9 | README es el de `create-next-app` | README reescrito 09-16 (`e27238c`) | `[G]` |
| DD-05 | `README.md` | Enlaza `.env.example` y dice "se agrega en este mismo cambio" | **No existe**; `e27238c` solo toca `README.md`; y `.gitignore:35` (`.env*`) lo ignoraría aunque se creara | `[R]` `git check-ignore -v .env.example` |
| DD-06 | `README.md` | Enlaza `./roadmap-futuro.md` | El archivo está en `docs/etapa-2/roadmap-futuro.md` | `[R]` |
| DD-07 | `README.md` | Tabla de scripts | Omite `lint` y `seed:monsters`; el flujo de setup no menciona sembrar monstruos | `[C]` |
| DD-08 | `README.md` | Para setup: `npx prisma migrate deploy` | La DB real no tiene `_prisma_migrations` (P3005 esperable) | `[R]` |
| DD-09 | `spec-tecnico-etapa-1.md` | §6 "Recuperación de contraseña sin definir"; §7 "automatización de tiradas fuera de alcance" | Superados (S2-5 en el mismo archivo §8; Sprint 3). No hay anotación de superación en §6/§7. La numeración es 6→8→7 (bitácora insertada antes de §7) | `[D]` |
| DD-10 | `roadmap-futuro.md` | Sprint 3 = dados + bonificadores + roster con `campaignId` nullable/`isGlobal` | Se construyó Opción B y acciones/economía; bonificadores no. (README advierte "ganan los specs") | `[D]` |
| DD-11 | Specs Etapa 3 (monstruos) | §6 "Pendiente de detallar" JSON; §7 UI del selector "sin diseñar" | Ya implementados (`a578095`, `c8b939a`); sin bitácora para C, D, E (solo hay para de99151, F, H, hook) — el registro de C/D/E vive únicamente en cuerpos de commit | `[D][G]` |
| DD-12 | Incident log | MonsterTemplate sobrevivió por reseed post-incidente | Contradicho por `createdAt` (§9) | `[R]` |
| DD-13 | `schema.prisma` / `combat.ts` | Comentarios "← add this", "not yet updated in this pass", "one combat at a time at the query level" | Obsoletos (project-spec 7.1/7.2) | `[C]` |
| DD-14 | `CLAUDE.md` (índice en README) | "Formato de reporte al cerrar una tarea" | Ahora también contiene la política de DB destructiva | `[C]` |

### 13.2 `TEST DRIFT`

- **Los 3 specs e2e son coherentes con la UI** (todos los `data-testid` usados existen: `app-header`, `app-header-wordmark`, `user-menu-*`, `invite-code-*`) `[R]` por lectura; **no ejecutados**.
- **Drift de cobertura, no de aserciones:** los 3 specs son de Sprint 2 (header, chip de invitación, editar campaña). No hay cobertura de login/registro/join, de ningún flujo de combate, de los guards, ni de S2-6/S2-9 (declarado en la bitácora "no asumir que está testeado").
- **Único test unitario:** `domain/dice` (22/22 `[R]`). **Sin `npm test`** (se corre con `node --experimental-strip-types --test` a mano).
- **`domain/combat/rules.ts` (`computeTurnOrder`, `computeCurrentActor`, `computeAdvanceTurn`) y `action-guards.ts` no tienen tests**, siendo las funciones que `CLAUDE.md` marca como críticas compartidas/de autorización.
- **Las verificaciones de Sprint 3** fueron scripts temporales (borrados) que replican lógica de Prisma sin pasar por `auth()`: **la evidencia de "verificado en vivo" no es reproducible** desde el repo.

### 13.3 Otras inconsistencias de código/proceso

- **Dos formas de escribir** conviven (project-spec 7.13): `{ok,error}`, `throw/redirect`, `{error?,success?}`.
- **`getCombatByJoinCode`, `getActiveCombat`, `getCombatById`** sin consumidores `[C]`; `HelloWorld.tsx` sin importar; `cookies-next` sin uso.
- **Artefactos binarios/ruido:** `project.zip` (untracked, es un `git archive` de `189aa21`, 08-27) y `docs/etapa-2/files.zip` ignorados por `*.zip`; en mayo se commiteó `project.zip`/`archive.zip` en cada paso (67 KB→1.2 MB) y se borró el 05-27/07-16 `[G]`. Interpretación (transferir snapshots a un chat) = `[I]`.
- **Dos ramas locales de respaldo** (`backup-fork-e-economytype`, `backup-local-20260831`).

---

## 14. Estado del proyecto

### 14.1 Implementado (leído en código/docs; e2e no ejecutado)

Auth completa (email/OAuth/verificación/reset/perfil) · campañas + roles + invitación + edición · plantillas y grupos por campaña · combate completo (iniciativa, HP, condiciones, muerte, economía, reorden, mid-combat, log) · espectador con HP cualitativo · ficha de personaje (solo lectura + notas) · roster global (9 monstruos/16 acciones) · CRUD de acciones de personaje con `economyType`/`uses` · flujo guiado de ataque/curación en `CombatRow` y `CurrentTurnPanel` · motor de dados · `tsc` limpio `[R]`.

### 14.2 Parcialmente implementado

- **Idioma:** logs en español; mensajes de error de `templates.ts`, `groups.ts`, `combat.ts` en inglés.
- **Autorización:** implementada en 5 capas pero sin tests; `addParticipantsFromGroup` acepta estructuralmente un combate ACTIVE.
- **Sprint 3:** roster ✔, acciones ✔, **G ✘**, salvaciones/bonificadores ✘.
- **E2E:** 3 specs.

### 14.3 Pendiente (declarado)

Sincronía en tiempo real (Sprint 5) · salvaciones/bonificadores de habilidad · G (bestiario) · finalizar/borrar campaña · DM ve ficha de jugadores · nombrar combates · concurrencia en `/join/character` · E4 · cobertura Playwright de S2-6/S2-9 · envío real de email de reset (Resend) · sprints 4–6 del roadmap.

### 14.4 Abandonado / muerto

`Combat.joinCode`/`isPublic` y su generación · `cookies-next` · getters de combate sin uso · `HelloWorld.tsx` · `Navbar` de 3 tabs (eliminado) · archivo `prismaschema.prisma:107` · `PATCH /api/campaigns/[id]` sin consumidor · ramas de respaldo.

### 14.5 Técnicamente inconsistente

- **DB sin historial de migraciones** (`_prisma_migrations` inexistente) `[R]`: el flujo documentado (`migrate deploy`) y `migrate dev` no son aplicables sin un paso que esta auditoría no propone.
- Dos arquitecturas para features gemelas (`/api/campaigns/[id]` PATCH vs. Server Action; `/api/profile`).
- `Participant.template` es un objeto sintético para monstruos (`templateId: null` es el flag real); el store depende de estar hidratado desde el mapper.
- `turnOrder: 0` en `addParticipantsFromGroup`.
- Enforcement de sesión repartido (proxy vs. `page.tsx` en `/combat/*`).

### 14.6 Documentación desactualizada

DD-01…DD-14 (§13.1).

### 14.7 Tests que no representan el sistema

Los e2e (3) representan solo Sprint 2; ninguno cubre combate, auth de Sprint 1 ni guards. `roll.test.ts` está desconectado de `package.json`.

---

## 15. Developer Input Required

Solo preguntas que el repo no puede responder.

1. **P1 — Esfuerzo real y calendario.** ¿"3–4 semanas" es el bloque 08-14→09-16? ¿Qué pasó entre 05-31→07-16 y 07-20→08-14 (hay migraciones fechadas 06-05 y 07-21 que se commitearon el 07-16 y el 08-15: ¿trabajo local sin commitear?)
2. **P2 — Visión original (mayo).** ¿El multijugador/campañas ya eran objetivo cuando diseñaste el schema del día 0? ¿De dónde salieron `AppState`, `RollMode AUTO` y `LogType ATTACK/EFFECT`, y por qué el MVP se recortó al día siguiente?
3. **P3 — Dónde vivían los requisitos en mayo–julio.** ¿Hubo specs/chats? ¿Para qué se usaban `project.zip`/`archive.zip` (commiteados en cada paso)? ¿Existen esos chats?
4. **P4 — Stitch.** ¿Cuántas rondas hubo (el spec menciona dos addenda), cuánto tiempo tomaron, y siguen recuperables los mockups/addenda? ¿Se diseñó antes o después de `project-spec.md` (08-24)?
5. **P5 — Origen de Sprint 3.** ¿El flujo de ataque vs. CA con acciones guardadas, el reorden drag-and-drop (08-15) y el ticket G fueron pedidos por alguien o surgieron de tu uso? ¿Por qué se reemplazó "bonificadores de salvación/habilidad" del roadmap por acciones/economía?
6. **P6 — S2-6.** ¿"Solo lectura + notas" fue una decisión de producto deliberada o un recorte por tiempo/complejidad?
7. **P7 — Dos entornos.** ¿Qué son las identidades `Gonzalo Murua` / `gonzaloPukiMurua` (¿máquina local vs. sesiones web?) y a qué `DATABASE_URL` apuntaba cada una? ¿Qué pasó el 09-10 con `de48cde` (¿trabajaste en paralelo sin saberlo, o fue intencional?)
8. **P8 — Incidente.** ¿Ejecutaste (fuera de Claude Code, o en otra sesión) `prisma migrate reset`, `db push --force-reset/--accept-data-loss`, SQL o una restauración desde el panel de Supabase entre el 09-08 y el 09-15? En particular alrededor del 09-10 noche (migración `add_action_economy_type`, 21:12 -03) y del 09-11 00:16 (cuando se crearon las filas de monstruos actuales). ¿Pausó/restauró Supabase el proyecto? ¿Los logs (`supabase_logs.json`) los exportaste antes o después de que reaparecieran los datos?
9. **P9 — Producción.** ¿La app desplegada (Vercel, mencionada desde 05-05 y como "app ya desplegada" en S2-0) apuntaba a la misma DB? ¿Hubo usuarios reales que usaran el sistema con esa base?
10. **P10 — Dos paneles de mutación.** ¿Que `CombatRow` y `CurrentTurnPanel` compartan responsabilidad fue una decisión de UX o un accidente de mayo?

---

## 16. Methodological Findings

### 16.1 Evidencia fuerte (demostrable con código, commits, docs o consultas)

1. La misma clase de hueco (**superficie de impacto no enumerada**) apareció al menos 5 veces consecutivas: D16 (lectura), S2-0 (escritura), S2-6 (propiedad), `templateId` nullable, S2-12 (cálculo compartido). `[G][D]`
2. La regla derivada de un hallazgo se formuló **estrecha** (D16 "para `page.tsx` de lectura") y el mismo defecto reapareció en el vector vecino tres días después. `[D]`
3. Las reglas de dominio críticas (turno, mid-combat, economía↔acción) se **escribieron después** de estar implementadas (en la regla `rules.ts` existía el comportamiento; la decisión apareció en el commit S2-12). `[G]`
4. Los artefactos de diseño (Stitch, addenda) y los chats no están versionados; la traza de decisión vive en cuerpos de commit, bitácoras y, presumiblemente, chats. `[D]`
5. La documentación de estado quedó desactualizada en **≤ 2 días** (DD-01) y contiene enlaces a archivos inexistentes (DD-05/06) en el mismo commit que los introduce. `[G][R]`
6. **Un solo entorno de DB** para desarrollo, e2e, verificación y migraciones; sin backup; y hoy sin `_prisma_migrations`. `[R]`
7. El relato de incidente contiene una explicación (survival de `MonsterTemplate`) contradicha por los datos. `[R]`
8. Cobertura automatizada mínima en lo crítico: 0 tests de guards y de `rules.ts`; e2e de Sprint 2 únicamente. `[C]`
9. La verificación "en vivo" de Sprint 3 no es reproducible ni ejercita autorización. `[D]`
10. El proyecto tuvo **dos regímenes de proceso**: 40 commits sin docs/mensajes genéricos (mayo–julio) vs. 41 con specs, bitácoras y trailers (agosto–septiembre). `[G]`

### 16.2 Inferencias razonables (varios indicios, no demostradas)

- El paso a Zustand era previsible al aparecer el segundo panel de mutación (EV-02→EV-03).
- Las migraciones fechadas 06-05/07-21 indican trabajo local sin commitear durante semanas.
- `project.zip` era un mecanismo de transferencia de contexto a un chat web.
- Hubo al menos dos entornos de trabajo con copias divergentes (identidades, reflog, `de48cde`).
- El control de "reporte de cierre" en `CLAUDE.md` es una reacción a EV-09/EV-10.
- La visión de rolls automáticos existía desde el día 0 y se pospuso por secuencia, no por descarte.

### 16.3 UNKNOWN

Causa y fecha del vaciado de datos · si hubo multijugador/campañas en la visión original · origen de reorden, ataque-vs-CA y G · esfuerzo real · contenido y número de iteraciones de Stitch · si la DB apuntada por el despliegue era la misma · cobertura real de la investigación del incidente (sesiones web).

### 16.4 Los 7 problemas metodológicos que este proyecto aporta como evidencia

*(Enunciados como problemas, sin proponer cambios al OS.)*

1. **Decisiones de alto costo de reversión sin inventario de consumidores.** Se valida el *concepto* (bien) pero no se enumera qué código/datos/tests/docs lo consumen. Genera rework de propagación (EV-08, EV-12) aun con decisiones correctas.
2. **Requisitos transversales tratados como propiedad de cada feature.** Autorización, scoping y cálculos compartidos se resolvieron pantalla a pantalla/acción a acción, y el hallazgo de un vector no se generalizó a los vecinos (EV-09, EV-10). Aquí *el proceso de auditoría posterior* (regenerar el spec) hizo la detección, tarde.
3. **Reglas de dominio implícitas.** El comportamiento real quedó en el código antes que en un documento; se descubrió recorriendo el código o probando la app (EV-10, EV-13). El dominio (D&D) es conocido por quien desarrolla, lo que reduce el incentivo a escribir lo "obvio".
4. **Diseño-primero sin conciliación con el modelo de datos ni versionado de artefactos.** La herramienta de diseño inventa datos sin respaldo; los mockups y addenda no quedan en el repo; el sistema visual llegó después de meses de UI (EV-07, EV-08).
5. **Verificación e infraestructura como dependencia no gestionada.** Sin navegador, sin entorno separado, sin backup, con auth no ejercitada en las verificaciones y evidencia no reproducible; consecuencia: ítems "NO verificado" que se arrastran entre sprints (E4) y un incidente sin causa demostrable (B-02, D-13, EV-16).
6. **Documentación de estado duplicada y sin dueño.** Varios documentos "de estado" (project-spec, README, bitácoras, roadmap, incident log) se contradicen entre sí y con el repo; el costo de mantenerlos es alto y el drift medible en horas (§13.1).
7. **Cambio de régimen de proceso a mitad de proyecto y entornos de trabajo paralelos.** La primera fase sin especificación produjo fundaciones (estado, identidad) que la segunda debió redescubrir y reemplazar; y la coexistencia de copias de trabajo generó trabajo duplicado (EV-04, EV-15).

---

## Apéndice A — Métricas de referencia `[R][G]`

| Métrica | Valor |
|---|---|
| Commits / días con commits | 81 / 40 |
| Autores (mismo email) | `Gonzalo Murua` 63 · `gonzaloPukiMurua` 18 |
| Commits antes / después del 08-14 | 40 (0 con trailer Claude) / 41 (33 con `Co-Authored-By: Claude`, 14 `Claude-Session` distintos) |
| Migraciones | 19 |
| Commits que tocan `schema.prisma` | 15 (+1 merge) |
| Archivos más modificados | `CombatRow.tsx` 22 · `combat.ts` 20 · `participant.ts` 18 · `CombatView.tsx` 16 · `schema.prisma` 15 · `setup/page.tsx` 13 · `combatStore.ts` 12 |
| Commits de "fix" (por palabra clave del asunto) | 19/40 antes del 08-14 · 3/41 después |
| Commits `docs:` | 9 |
| Tests | 22 unitarios (dados) + 3 specs e2e |
| Líneas en `src/` | ≈ 11.8k |
