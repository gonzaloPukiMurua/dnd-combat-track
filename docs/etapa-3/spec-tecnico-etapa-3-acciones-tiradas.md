# Etapa 3 — Acciones de personaje/monstruo y resolución de tiradas en combate

> Segunda pieza del spec técnico de Sprint 3. Cubre acciones guardadas (ataques y curación)
> y su resolución dentro del combate. **Las salvaciones quedan explícitamente fuera de este
> documento** — se diseñan junto con los bonificadores de habilidad del personaje, en un
> documento aparte todavía pendiente, porque una tirada de salvación necesita ese bonificador
> para tener sentido y no queremos construirla dos veces.

---

## 1. Alcance decidido

- Fórmulas de daño/curación **guardadas por personaje/monstruo**, no tipeadas a mano cada vez.
- Ataques resuelven impacto (d20 + bonificador vs. CA del objetivo) **y** daño, no solo daño.
- Curación: solo tirada de fórmula, sin tiro de impacto (no aplica).
- Fuera de esta etapa: salvaciones, ventaja/desventaja, ataques con área de efecto o
  multi-objetivo, cualquier automatización de qué pasa al fallar/impactar (el DM sigue
  decidiendo si aplica el daño con el botón existente — ver sección 5).

## 2. Modelo de datos

Mismo patrón polimórfico que ya se definió para `CombatParticipant` en
`spec-tecnico-etapa-3-monstruos.md` (FK opcional a uno de los dos templates):

```prisma
enum ActionKind {
  ATTACK
  HEAL
}

model TemplateAction {
  id                  String     @id @default(uuid())
  characterTemplateId String?
  monsterTemplateId   String?
  name                String     // "Espada larga", "Mordisco", "Curar heridas"
  kind                ActionKind
  attackBonus         Int?       // requerido si kind = ATTACK, null si kind = HEAL
  formula             String     // notación de dados — daño si ATTACK, curación si HEAL
  damageType          String?    // solo sabor ("cortante", "fuego") — no mecánico
  order               Int        @default(0) // orden de despliegue dentro del template

  characterTemplate CharacterTemplate? @relation(fields: [characterTemplateId], references: [id], onDelete: Cascade)
  monsterTemplate   MonsterTemplate?   @relation(fields: [monsterTemplateId], references: [id], onDelete: Cascade)
}
```

Regla de aplicación (igual que `CombatParticipant`): exactamente uno de los dos FKs seteado.
Validar en el server action de creación/edición, no es un constraint de DB.

**Por qué tabla propia y no JSON** (a diferencia de `acModifiers`/`conditions` en
`CombatParticipant`, que sí son JSON): las acciones son contenido de primera clase que el DM
crea/edita por formulario con su propia validación por campo (nombre, bonificador, fórmula) —
mismo criterio que ya se aplicó para tratar `CharacterTemplate`/`MonsterTemplate` como tablas
reales y no como blobs. El JSON de `CombatParticipant` es para listas chicas y efímeras
propias del combate en curso (condiciones, modificadores temporales); las acciones son
persistentes y reutilizables entre combates.

**No se snapshotea en `CombatParticipant`.** A diferencia de HP/CA/características, que sí se
copian al agregar el participante, las acciones se leen en vivo del template de origen al
momento de tirar — si el DM edita la fórmula de un arma a mitad de campaña, la próxima tirada
usa la fórmula nueva. No hay razón para congelarlas: no cambian por el estado del combate.

## 3. Notación de dados soportada

Gramática mínima, sin operadores compuestos ni dados de distinto tipo en la misma fórmula:

```
NdM[+K | -K]
```

- `N`: cantidad de dados (entero ≥ 1).
- `M`: caras del dado (uno de 4, 6, 8, 10, 12, 20, 100 — mismos valores que ya usa el resto
  de la app, ej. `startCombat` para iniciativa usa d20).
- `+K`/`-K`: modificador fijo opcional (entero, puede ser negativo el resultado final pero no
  el modificador en sí más allá de lo obvio).

Ejemplos válidos: `1d8`, `2d6+3`, `1d4-1`, `8d6` (aliento de dragón, sin modificador).
Fuera de alcance: `1d8+1d6` (múltiples tipos de dado), `2d20kh1` (ventaja/desventaja con
keep-highest) — si hace falta esto último, es la extensión natural para cuando se diseñe
ventaja/desventaja, no ahora.

Función pura a implementar, sin estado, testeable aislada:

```ts
function rollFormula(formula: string): { total: number; rolls: number[]; modifier: number }
```

Vive en `domain/dice/` (paquete nuevo, mismo criterio de separación que ya tiene
`domain/combat/`) — no depende de Prisma ni de nada de combate, es aritmética pura + RNG.

## 4. Flujo de ataque (impacto + daño)

1. DM expande la fila del participante que ataca (`CombatRow`, ya existe la expansión).
2. En vez del input de número libre actual para daño, se agrega un selector de acción — lista
   de `TemplateAction` del template de origen (`kind: ATTACK`), leída en vivo vía el
   `templateId`/`monsterTemplateId` que ya tiene el participante (no hace falta un nuevo campo
   en `CombatParticipant`, ya existe la FK).
3. DM elige objetivo — mismo `targetId` que ya usa `dealDamage` hoy, no cambia.
4. Al tirar: `d20 + action.attackBonus` vs. `computeAcTotal(target.baseAc, target.acModifiers)`
   (función ya existente, se reusa tal cual). Se muestra el resultado como información —
   "17 vs CA 15 → Impacta" o "9 vs CA 15 → Falla" — **no bloquea nada**.
5. Independientemente del resultado del paso 4, se tira `action.formula` y el resultado
   prellena el mismo input de `amount` que ya existe — el DM decide si confirma con el botón
   "Daño" de siempre, igual que hoy. Esto es deliberado: un DM puede tener una razón de mesa
   para aplicar daño en un "fallo" narrativo (crítico especial, regla homebrew) — no se le
   fuerza la mano.
6. Al confirmar el daño, el log (`dealDamage` ya escribe a `CombatLog`) se enriquece con el
   detalle de la tirada: algo como *"Bravo ataca con Espada larga: d20+5=17 vs CA 15 →
   Impacta. Daño: 1d8+3=9"* en vez del genérico actual. Es una extensión del `note` que
   `dealDamage` ya arma, no una tabla nueva — mismo lugar donde S2-11 tradujo los strings.

## 4b. Addendum — economía de acción como filtro del flujo (post-diseño, pre-F)

Surgió probando la app: el flujo original (§4) no distinguía qué tipo de economía de acción
consume cada `TemplateAction` — quedaba desconectado de `actionUsed`/`bonusUsed`/
`reactionUsed`, que ya existen en `CombatParticipant` desde antes de esta etapa (toggle
manual del DM, sin relación con qué acción se usó). Se decide conectar ambos.

**Schema**: `TemplateAction` gana `economyType ActionEconomy` (enum `ACTION | BONUS_ACTION |
REACTION`, requerido). Migración con `@default(ACTION)` para las filas ya sembradas por C —
el DM corrige puntualmente después vía el CRUD de E si algo debería ser Bono/Reacción.

**Flujo revisado** (reemplaza al de §4 punto 2 en adelante):

1. DM expande la fila del participante en su turno.
2. Selector de economía — Acción / Bono / Reacción — deshabilitado el que ya esté gastado
   (lee `actionUsed`/`bonusUsed`/`reactionUsed` directo del participante, sin query nueva).
3. Filtra a las `TemplateAction` de ese `economyType` (ATTACK y HEAL pueden convivir bajo el
   mismo tipo — ej. una curación de Bono al lado de un ataque de Bono, si existiera).
4. Acción elegida, `uses > 1`: se repite la secuencia objetivo→tirada→aplicar tantas veces
   como `uses` indique, un objetivo genuinamente distinto por vez si el DM lo desea (ej.
   Espada larga ×2 contra dos objetivos separados) — sin cambio de modelo, ya cubierto por
   `uses`.
5. **`actionUsed`/`bonusUsed`/`reactionUsed` se marca recién al confirmar el primer
   daño/curación de esa invocación** (click en Daño/Curar), no al solo elegir la acción —
   decisión explícita para no penalizar a un DM que abre el menú y se arrepiente antes de
   aplicar nada.
6. **El input libre de cantidad (`amount` manual) se mantiene** como alternativa separada,
   fuera del selector de economía — para daño de entorno, homebrew, o cualquier caso no
   modelado como `TemplateAction`. No pasa por el gating de economía ni lo consume.

## 5. Flujo de curación

Más simple: selector de acción (`kind: HEAL`) del propio participante que se cura o de quien
la aplica (según cómo esté modelado hoy el flujo de curación en `CombatRow` — a confirmar
contra el código real al implementar, no asumido acá), tira `action.formula`, prellena
`amount`, DM confirma con "Curar" de siempre. Sin tiro de impacto, no aplica.

## 6. Gestión de acciones (quién las crea/edita)

- **`CharacterTemplate`**: nueva sección en el formulario de edición existente
  (`/campaigns/[id]/templates/[templateId]/edit`, D13) — lista de acciones con
  agregar/editar/borrar, DM-only (mismo guard que ya tiene esa ruta). No se agrega a
  `CreateTemplateForm.tsx` (creación) — un personaje se crea primero, las acciones se suman
  después en edición, para no sobrecargar el formulario de alta.
- **`MonsterTemplate`**: sin UI, igual que el resto de esa tabla (`spec-tecnico-etapa-3-
  monstruos.md` §6) — las acciones de cada monstruo van en el mismo
  `prisma/seed-data/monsters.json`, como un array anidado por monstruo, cargadas por el mismo
  script de seed.

## 7. Pendiente de definir antes de picar código

- Shape exacto del JSON de seed de monstruos con acciones anidadas (extiende lo que ya
  esbozó `spec-tecnico-etapa-3-monstruos.md` §6).
- Confirmar contra el código real de `CombatRow.tsx` cómo está modelado hoy el flujo de
  curación (quién es "actor" vs "target") antes de diseñar el selector de acción de curación
  en detalle — la sección 5 de este documento queda a nivel de intención, no de UI final.
- Copy exacto de los mensajes de impacto/fallo y el formato del log enriquecido.

## 7b. Addendum — flexibilidad para stat blocks completos (post-diseño, pre-seed de C)

Surgió al armar el seed de monstruos: un stat block completo tipo D&D (ej. Dragón azul
adulto) trae características, habilidades, inmunidades, salvaciones con recarga, y acciones
legendarias — mucho más de lo que este documento modeló. Decisión: agregar SOLO lo que tiene
un consumidor ya planeado, todo lo demás va como texto libre en `notes`.

- **Se agrega ahora**: `TemplateAction.uses Int @default(1)` — cubre multiataque
  ("Desgarro +12 (×3)" = una acción con `uses: 3`). No es un caso exótico de dragón, es un
  hueco real del diseño original (cualquier criatura con ataque extra lo necesitaba).
- **Queda en `notes` indefinidamente, sin fecha de reconsideración**: acciones legendarias
  (economía de acción sin ningún soporte hoy, la más especulativa).
- **Queda en `notes` hasta que el consumidor exista**:
  - Características/habilidades → hasta que se diseñe el sistema de bonificadores (mismo
    motivo por el que ya se excluyeron de `MonsterTemplate` en §5).
  - Inmunidades → hasta que `dealDamage` conecte `damageType` a algo mecánico (hoy es puro
    sabor, ni se lee).
  - Salvaciones con recarga (ej. aliento de dragón) → se diseña junto con `ActionKind.SAVE`
    en el documento de salvaciones/bonificadores, no aislado acá. El campo de recarga
    (`rechargeMin: Int?`) es una extensión barata de sumar en ese momento si hace falta.

Regla general para no repetir esta conversación cada vez que aparezca un stat block más
complejo: **un campo estructurado nuevo necesita un consumidor mecánico ya planeado, no solo
un dato que "estaría bueno tener"** — mismo principio que ya aplicó S2-8 al conectar (no
esconder) los campos fantasma del personaje.

## 8. Ticket nuevo (G) — visibilidad del roster global

Surgió de la misma pasada de feedback: el roster global de monstruos (C) no tiene ningún
lugar donde explorarse — ni para mirar qué hay disponible, ni para filtrar en el picker de
combate más allá del agrupamiento por "Templates de campaña" / "Roster global" que ya
construyó D. Dos piezas chicas, empaquetadas juntas por compartir la misma fuente de datos
(`getMonsterTemplates()`, ya existe desde D):

- **Página de exploración de solo lectura** — nueva ruta fuera del scope de una campaña (la
  data no es campaign-scoped, no tiene sentido anidarla bajo `/campaigns/[id]/...`). Filtro
  por `category` en cliente (el dataset es chico, no amerita filtro server-side). Accesible a
  cualquier usuario logueado, sin distinción de rol — es contenido de sistema, no de gestión.
- **Sub-agrupación por categoría en el picker de combate** (D) — el `<select>` con optgroups
  "Templates de campaña" / "Roster global" ya existe; se agrega sub-agrupación por
  `category` dentro de "Roster global" para no escrollear una lista plana a medida que el
  bestiario crezca más allá de los 9 sembrados por C.

## 9. Fuera de este documento (todavía sin diseñar)

- Salvaciones + bonificadores de habilidad del personaje (documento combinado, pendiente).
- Ventaja/desventaja, ataques de área, críticos con reglas especiales.
- Cualquier automatización de efectos al impactar/fallar (condiciones automáticas, etc.).

## 10. Ticket nuevo (H) — extender el flujo guiado a CurrentTurnPanel.tsx

Surgió al cerrar F: `CombatRow.tsx` recibió el selector de economía → acción → objetivo →
tirada (§4b), pero `CurrentTurnPanel.tsx` tiene su propio control de Daño/Curar/Target
duplicado, sin tocar. Con F cerrado, la app queda con **dos caminos distintos** para aplicar
daño/curación — uno guiado, uno crudo — dependiendo de qué panel esté usando el DM en ese
momento. Es una inconsistencia real de UX, no cosmética: un DM se topa con comportamiento
distinto según el mismo tipo de acción.

Alcance de H: extender el mismo componente `GuidedActionPanel.tsx` (extraído en F) a
`CurrentTurnPanel.tsx`, reusándolo tal cual en vez de reimplementar la lógica de gating ahí.
No es una feature nueva — es aplicar F al segundo lugar donde ya hacía falta. Conviene
esperar a tener F verificado en vivo contra un combate real antes de replicar el patrón, para
no propagar un bug de F a dos lugares a la vez.

## 11. Bitácora de implementación (C–H, Sprint 3)

Mismo criterio que spec-tecnico-etapa-1.md §8: estado real, verificado contra el código y
(donde se indica) contra la DB real, no un resumen de intención. Cubre los cuatro commits de
esta pasada, en orden.

**de99151 — `economyType` en `TemplateAction`:** agrega el enum `ActionEconomy { ACTION
BONUS_ACTION REACTION }` y la columna `TemplateAction.economyType @default(ACTION)`
(migración `20260911001249_add_action_economy_type`), reusando el mismo enum que ya
consumían `CombatParticipant.actionUsed/bonusUsed/reactionUsed` desde antes de esta etapa —
no se creó ningún tipo nuevo del lado de `CombatParticipant`. Validado en
`templateActions.ts` con el mismo criterio que ya aplicaba a `kind` (debe ser uno de los
valores propios del enum, si no `{ error }`). `TemplateActionsSection.tsx` suma el `<select>`
de economía en alta y edición, más una badge por fila. El seed (`monsters.json` +
`seed-monsters.ts`) declara `economyType: "ACTION"` explícito en las 16 acciones ya
sembradas por C — todas son ataques de arma física, ninguna necesitó Bono/Reacción.
Idempotencia: confirmada **por lectura de código**, no por una corrida en vivo dedicada a
este commit — el mecanismo de upsert que ya traía `seed-monsters.ts` (por `name` de
monstruo y por la unique key `(monsterTemplateId, name)` de cada acción) no cambió con este
commit, así que reejecutar `npm run seed:monsters` sigue sin duplicar filas; este commit es
anterior a las verificaciones en vivo de esta sesión (F en adelante), así que no hay una
corrida registrada específica para él.

**0724a6b (F) — flujo guiado economía→acción→tirada en `CombatRow.tsx`:** DM elige
Acción/Bono/Reacción (deshabilitado lo ya gastado, leído directo de
`actionUsed`/`bonusUsed`/`reactionUsed`), después una `TemplateAction` de ese tipo, tira
`d20+attackBonus` vs `computeAcTotal(target)` para `ATTACK` (informativo, nunca bloquea),
tira la fórmula de daño/curación y prellena el input de cantidad existente — el DM sigue
confirmando con el botón Daño/Curar de siempre. Multiataque (`uses > 1`) repite
objetivo→tirada→aplicar por uso, con un objetivo nuevo posible en cada vuelta.
`actionUsed`/`bonusUsed`/`reactionUsed` se marca recién al confirmar el primer daño/curación
de la invocación (no al elegir la acción, no en usos posteriores del mismo multiataque) — el
chequeo es directo contra el valor actual del campo (`!p[field]`) antes de decidir si llamar
a `toggleActionState`, sin agregar un flag nuevo de "ya marcado".

Cambios de soporte, todos necesarios por lo anterior: `queries/combat.ts` no traía
`TemplateAction` en el include de participantes — se agregó `actions` (ordenadas) bajo
`template` y `monsterTemplate`; `mappers/combat.ts` unifica ambas ramas como
`template.actions` en el view-model (`mapAction`, compartida); `domain/combat/types.ts` gana
`ActionKind`/`ActionEconomy`/`TemplateActionView`, `Participant.template.actions`, y
`ParticipantSummary` gana `baseAc`/`acModifiers` (la tirada de impacto necesita la CA del
objetivo, y el único listado de participantes que llegaba a `CombatRow` era el resumen
liviano); `participant.ts` — `dealDamage`/`healParticipant` aceptan un `rollNote` opcional
que se pliega en el `note` de `CombatLog` existente (mismo criterio de string en español que
fijó S2-11); `GuidedActionPanel.tsx` — nuevo, puramente presentacional, todo el estado y la
matemática de tirada viven en `CombatRow.tsx` (así se documentó en el propio componente, ver
comentario de cabecera).

Verificación en vivo (script temporal + cleanup, campaña/combate ACTIVE sembrados en la DB
real de Supabase, monstruo real del roster global — Simio con Puñetazo `uses: 2`): filtro
`economyType: ACTION` devuelve exactamente `[Puñetazo, Roca]` (se agregó una acción
`REACTION` temporal al mismo Simio solo para probar la exclusión, borrada al final —
alcance admitido explícitamente como extra en el reporte de esa pasada); primer uso del
multiataque contra un objetivo → `actionUsed` pasa `false→true`, `CombatLog` con **una**
fila cuyo `note` trae el detalle de la tirada (`"Ataca con Puñetazo: d20+5=... vs CA ... →
Impacta/Falla. Daño: 1d6+3=... — uso 1/2"`); segundo uso contra otro objetivo → **no** se
vuelve a invocar `toggleActionState` (`shouldToggleEconomy` da `false` porque el campo ya
era `true`), `actionUsed` se mantiene en `true`, `CombatLog` termina con exactamente 2 filas
(no una fantasma por el toggle — que de por sí nunca escribe `CombatLog`, solo flipea el
booleano); caso HEAL sin tirada de impacto, `bonusUsed` pasa a `true`, HP correcto. Limpieza
confirmada por query: cero filas residuales de campaña/combate/participantes/logs/usuario, y
el Simio global de vuelta a sus 2 acciones originales.

**Limitación conocida, no resuelta:** la capa de autorización (`auth()` / next-auth) **no se
ejerció** en esta verificación ni en las de H/hook más abajo — el script llama Prisma
directo replicando la lógica de `dealDamage`/`healParticipant`/`toggleActionState`, no las
Server Actions exportadas, porque `auth()` necesita contexto de request HTTP real
(`cookies()`) que un script standalone no tiene. Los guards de `action-guards.ts`
(`requireParticipantAccess`, `requireParticipantDmAccess`) siguen sin un test en vivo
posterior a este cambio — quedan cubiertos únicamente por lectura de código.

**54c2c36 (H) — extensión a `CurrentTurnPanel.tsx`:** antes de asumir que
`GuidedActionPanel.tsx` encajaba tal cual, se confirmó contra el código real cómo armaba
`CurrentTurnPanel.tsx` su propio Daño/Curar/Target — crudo, sin `rollNote` ni gating de
economía, con un tipo `CurrentActor` que ni siquiera traía `template.actions`. Se confirmó
también que el `actor` que le pasa `CombatView.tsx` (vía `computeCurrentActor(participants,
currentTurnIndex)`) ya es el `Participant` completo del store — con `template.actions`
incluido de fábrica gracias al include/mapper que F ya había extendido — así que no hizo
falta tocar `CombatView.tsx` ni el mapper, solo ensanchar el tipo local `CurrentActor`.

**Decisión de esta pasada que quedó revertida en el siguiente commit, dejada como parte de
la historia:** en 54c2c36 el wiring de estado (los mismos `useState` de
economía/acción/tirada + `handleSelectEconomy`/`handleSelectAction`/`handleGuidedRoll`/
`advanceGuidedUse`/`handleDamage`/`handleHeal`) se **duplicó** línea por línea en
`CurrentTurnPanel.tsx` a partir de `CombatRow.tsx` (mismo cuerpo, `p` renombrado a `actor`).
Fue una decisión consciente en su momento — la consigna de H pedía reusar
`GuidedActionPanel.tsx` sin tocarlo, no necesariamente extraer un hook nuevo, y hacerlo
hubiera tocado también `CombatRow.tsx` — pero quedó registrada como riesgo de duplicación
real (un bug corregido en un lugar y no en el otro) hasta que 8530a1a la resolvió.

Verificación en vivo: campaña descartable (sin tocar el roster global esta vez, ya que no se
repitió el test del filtro de economía) con Simio en modo **solo lectura** + un target con
una acción HEAL propia. Mismo trace que F — multiataque uso 1/2 marca `actionUsed`, uso 2/2
no re-togglea, `CombatLog` con 2 filas, HEAL correcto. Un detalle real (no un bug) que surgió
en esta corrida: el HP del target llegó a exactamente 0 por la combinación de daños, así que
`healParticipant` agregó el sufijo *"recuperó la consciencia"* al `note` — comportamiento
correcto de la función ya existente (mismo mecanismo que la nota de "cayó inconsciente" de
`dealDamage`), lo que se tuvo que corregir fue la aserción del script de verificación, no el
código de la app. Limpieza confirmada por query, igual que en F.

**8530a1a — extracción de `useGuidedAction` (elimina la duplicación de 54c2c36):** antes de
diseñar la firma se releyeron ambos archivos completos y se confirmó que los handlers
guiados eran **idénticos** entre hosts salvo el nombre de la variable (`p` vs `actor`) — no
había ninguna diferencia real de comportamiento que preservar por separado.

**Por qué el hook no orquesta `mutate()`/`dealDamage`/`toggleActionState` directamente**
(a diferencia de la firma `useGuidedAction(actor, { onDamage, onHeal, toggleActionState })`
sugerida al pedir el refactor): `mutate()` (de `useCombatMutation()`) ya es compartido por
**todas** las mutaciones de cada host — HP temporal, condiciones, iniciativa, fin de turno,
no solo el flujo guiado. Si el hook llamara su propia `useCombatMutation()` internamente,
sería una segunda instancia independiente de la del host, y el indicador "Guardando…"/
`disabled` dejaría de reflejar exactamente cuándo una confirmación guiada está en vuelo —
un cambio de comportamiento observable, justo lo que un refactor puro no debe introducir.
Por eso el hook (`src/hooks/useGuidedAction.ts`) solo expone los valores derivados
(`guidedNote`, `pendingField`, `shouldToggleEconomy`, `targetName`, `roll()` devolviendo el
monto como string en vez de escribirlo, `advanceUse()`) y cada host sigue armando su propio
`mutate({ optimistic, action })` exactamente como antes — ahora leyendo esos valores del hook
en vez de estado local. `targetId` y `allParticipants` quedan fuera del hook por instrucción
explícita (cada host arma su target distinto — `TargetSelector` en `CombatRow.tsx`, un
`<select>` inline con opción "Uno mismo" en `CurrentTurnPanel.tsx`) y se le pasan como
parámetros de solo lectura.

Verificación en vivo: dos trazas independientes con fixtures **distintos** por host, en una
misma campaña descartable —
Escenario A ("como lo dispararía `CombatRow.tsx`"): Simio/Puñetazo;
Escenario B ("como lo dispararía `CurrentTurnPanel.tsx`"): Dragón azul adulto/Desgarro,
ambos `uses: 2` del roster global, en modo solo lectura. Los dos escenarios dieron el mismo
patrón de resultado que las corridas de F y H (toggle una sola vez, 2 filas de `CombatLog`,
HEAL correcto) — confirmando que mover el estado al hook no cambió ningún cálculo. Lo que
esta verificación **no** cubre: que el propio hook funcione como hook de React al
renderizarse (orden de llamadas, re-renders) — no hay runtime de React en un script de Node;
eso quedó cubierto solo por `tsc --noEmit`/`build`/ESLint limpios más revisión manual línea
por línea de cada `guided.*` contra el código original, no por un test de React en vivo.

**Nota para la próxima verificación en vivo contra esta DB:** tanto en F como en el refactor
del hook (8530a1a), el script de limpieza final se cortó una vez por un timeout intermitente
del connection pooler de Supabase (`P1001`, o el proceso colgado sin error) — nunca por
pérdida real de datos (se confirmó ambas veces con una query de diagnóstico aparte que lo ya
borrado seguía borrado). Mitigación aplicada: reemplazar cualquier `Promise.all` de varias
queries de verificación por awaits secuenciales reduce la frecuencia, pero no la elimina. No
es un bug para resolver ahora — es un aviso: quien verifique algo en vivo contra esta DB más
adelante debería esperar tener que reintentar o completar la limpieza a mano si el proceso se
corta, y confirmar con una query de diagnóstico aparte antes de asumir que algo quedó
huérfano.

**Estado abierto de Sprint 3 al cierre de esta bitácora:** el ticket **G** (§8 — página de
exploración de solo lectura del bestiario + sub-agrupación por categoría en el picker de
combate) sigue **sin implementar**. Salvaciones y bonificadores de habilidad del personaje
(§9) siguen **sin diseñar** — documento combinado pendiente, ninguna decisión tomada más
allá de la mención de que `ActionKind.SAVE` se diseñaría ahí si hiciera falta (§7b).