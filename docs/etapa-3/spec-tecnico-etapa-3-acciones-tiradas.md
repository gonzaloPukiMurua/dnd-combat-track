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