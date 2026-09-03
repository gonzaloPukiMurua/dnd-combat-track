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

## 8. Fuera de este documento (todavía sin diseñar)

- Salvaciones + bonificadores de habilidad del personaje (documento combinado, pendiente).
- Ventaja/desventaja, ataques de área, críticos con reglas especiales.
- Cualquier automatización de efectos al impactar/fallar (condiciones automáticas, etc.).
