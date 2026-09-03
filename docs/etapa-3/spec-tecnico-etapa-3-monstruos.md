# Etapa 3 — Roster global de monstruos: decisión de arquitectura

> Primera pieza del spec técnico de Sprint 3. Cubre solo el roster global de monstruos —
> tiradas de dados, bonificadores de salvación/habilidad y tiradas de habilidad quedan para
> documentos separados, todavía sin diseñar. No pasarle esto a un agente de código como si
> fuera el spec completo de la etapa.

---

## 1. El problema

`roadmap-futuro.md` señala que un roster global de monstruos **contradice a propósito** la
decisión 2 de la etapa 1 (`spec-tecnico-etapa-1.md`): *"el personaje pertenece a la campaña,
no es portable"*. Un monstruo global sin dueño de campaña es exactamente el caso que esa
decisión excluía. Hacía falta decidir cómo resolver la contradicción sin heredar el mismo
tipo de bug que costó caro en Sprint 1 (D16: una query sin scope de campaña mezclando datos
de campañas distintas).

## 2. Opciones evaluadas

**Opción A — `CharacterTemplate.campaignId` nullable + flag `isGlobal`.** Reusa toda la
lógica existente sin bifurcar código, pero cada query que hoy filtra por `campaignId` pasa a
necesitar una condición OR adicional para no ocultar los monstruos globales — mismo patrón
de riesgo que ya causó el bug de D16 (`getTemplates()` sin scope).

**Opción B — modelo separado `MonsterTemplate`, sin relación con `CharacterTemplate`.** Más
superficie nueva, pero acotada y explícita: ninguna query existente de `CharacterTemplate`
puede "olvidarse" del caso global, porque los monstruos no pasan por esa tabla.

**Decisión: Opción B.** Motivo adicional a la seguridad de queries: los monstruos y los
personajes están sujetos a reglas/mecánicas distintas (un monstruo no necesita nivel,
bonificador de competencia ni las 6 características si nada en la app las va a usar
mecánicamente todavía) — separar el modelo evita arrastrarle a `CharacterTemplate` campos que
solo tienen sentido para uno de los dos casos, en la línea del mismo principio que ya aplicó
D8/D9 en etapa 1 ("el hub muestra únicamente datos reales").

## 3. Integración con combate: sin pasar por `Group`

`Group`/`GroupMember` sigue siendo exclusivamente la herramienta de composición de encuentros
del DM para NPCs/monstruos **de campaña** (`CharacterTemplate`) — no se toca. El roster
global se agrega directo al combate desde un selector aparte en `/combat/[id]/setup`
("Templates de campaña" vs. "Roster global"), no a través de un `Group`.

Trade-off aceptado conscientemente: un DM no puede armar un `Group` reusable mixto
(NPCs de campaña + monstruos globales) en esta etapa. Si aparece esa necesidad más adelante,
es una extensión de `GroupMember` a evaluar en su momento — no se prediseña acá.

## 4. Por qué `CombatParticipant` no necesita paridad de campos

`CombatParticipant` ya es un snapshot completo: copia `level`, `proficiencyBonus`,
`str`...`cha`, `speed`, `hitDice`, `maxHp`, `baseAc` del template al momento de agregarlo al
combate, y después vive independiente — nunca vuelve a leer el template de origen. Por lo
tanto `MonsterTemplate` no necesita tener los mismos campos que `CharacterTemplate`: lo que
no provea cae en los defaults que `CombatParticipant` ya tiene (`str/dex/.../cha: 10`,
`proficiencyBonus: 2`, `speed: 30`, etc.).

## 5. Schema

```prisma
model MonsterTemplate {
  id              String   @id @default(uuid())
  name            String
  maxHp           Int
  baseAc          Int
  initiativeBonus Int      @default(0)
  speed           Int      @default(30)
  category        String?  // ej. "Bestia menor", "No-muerto" — para filtrar el picker
  notes           String?  // referencia estática de texto (ataques, habilidades), mismo
                           // criterio que el bloque "Acciones" ya existente en la ficha de
                           // personaje (spec-tecnico-etapa-1.md §7): sin lógica de tirada
                           // conectada. No se adelanta a las tiradas de habilidad de esta
                           // misma etapa ni a los recursos de clase de Sprint 4.
  createdAt       DateTime @default(now())
}
```

A propósito **no incluye** `level`, `proficiencyBonus` ni las 6 características — quedan
exclusivas de `CharacterTemplate`. El ticket de "bonificadores de salvación/habilidad" del
roadmap dice explícitamente *"en el personaje"*: los monstruos no entran al sistema de
tiradas de habilidad en esta etapa. Si más adelante un monstruo necesita tirar una salvación,
se agrega ahí, no antes.

### Cambios en `CombatParticipant`

- `templateId` pasa de requerido a opcional (`String?`).
- Se agrega `monsterTemplateId String?` (FK a `MonsterTemplate`).
- Regla de aplicación en `addParticipant` (no es un constraint de DB, Prisma no hace XOR
  nativo): exactamente uno de los dos debe estar seteado.
- **Efecto colateral a resolver**: `requireParticipantAccess`
  (`src/lib/auth/action-guards.ts`, S2-0) hace `participant.template.ownerId === userId` para
  decidir si un Jugador puede actuar sobre su propio personaje. Con `template` potencialmente
  `null` (participante de monstruo), pasa a `participant.template?.ownerId === userId` — el
  resultado sigue siendo correcto sin más cambios: un monstruo nunca tiene dueño jugador, así
  que cae naturalmente en "solo el DM puede actuar sobre esto", mismo comportamiento que ya
  tienen los NPCs sin `ownerId` hoy.

## 6. Carga del roster

Sin UI de creación en esta etapa (`roadmap-futuro.md`: *"cargado manualmente por vos como
desarrollador"*). Se resuelve con un archivo de datos + script de seed:

- `prisma/seed-data/monsters.json` — lista editable a mano, sin tocar código, formato JSON
  (no CSV: `notes` va a tener texto con comas y sin necesidad de escapar).
- `prisma/seed-monsters.ts` — script que lee el JSON y hace upsert contra `MonsterTemplate`
  (idempotente, mismo criterio que ya usa `e2e/global-setup.ts` para el seed de Playwright).

Pendiente de detallar en la próxima pasada: shape exacto del JSON, y si el script corre con
`npx tsx` standalone o se cuelga de `package.json` como script nombrado (`npm run seed:monsters`).

---

## 7. Fuera de este documento (todavía sin diseñar)

- Tiradas de dados (d4–d100).
- Campos de bonificador de salvación y de habilidad en el personaje.
- Tiradas de habilidad.
- El selector de "Roster global" en `/combat/[id]/setup` (UI) — el modelo de datos está
  decidido, falta el diseño de la pantalla.
