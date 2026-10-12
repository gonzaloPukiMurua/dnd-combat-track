# Catálogo de recursos de clase y espacios de conjuro — diseño

> Estado: **DISEÑO, sin construir** (2026-10-11). No hay código ni migración todavía.
> Se construye cuando se retome el tema "recursos en combate" (pendiente desde P2),
> para no tocar el modelo de `CharacterResource` dos veces.
> Fuera de alcance a propósito: **multiclase** (decisión del usuario). Un personaje
> tiene una sola clase.
> Etiquetas: **[regla]** confirmado contra fuente · **[verificar]** sin confirmar contra
> el PHB 2024 · **[decidir]** pendiente de tu decisión.

## 1. El problema

Hoy el DM crea cada recurso a mano por personaje (`ResourcesManager`, P2). Para recursos
que se repiten en cada guerrero de cada campaña ("Segundo Aire", "Oleada de Acción"), eso
genera filas duplicadas con nombres, máximos y reglas de recarga escritos a mano cada vez —
el mismo tipo de inconsistencia que ya se evitó para monstruos y hechizos con un catálogo
global (decisión D-3, P4).

## 2. Hallazgo que cambia el diseño: la recarga no es binaria

Al revisar Segundo Aire (2024) para este documento se confirmó —fuentes:
[dungeonmister.com](https://dungeonmister.com/guides/fighter-changes-dnd-5e-2024/) e hilos de
[D&D Beyond](https://www.dndbeyond.com/posts/1746-2024-Fighter-vs-2014-Fighter-whats-new)—
que **recupera 1 uso con descanso corto y todos con descanso largo**. **[regla]**

El modelo actual (`RechargeType: SHORT | LONG`) no puede expresar esto: solo sabe "todo con
el corto" o "nada con el corto". Para que el catálogo sirva de verdad, `CharacterResource`
tiene que generalizarse antes de poblarlo.

### 2.1 Cambio de esquema propuesto (reemplaza `recharge`)

El descanso largo **siempre** repone todo — no se conoce ningún recurso de las reglas
centrales que no se recupere del todo con un descanso largo, así que esa parte del
comportamiento actual (`usedAfterRest(r, "LONG") → 0` sin mirar el recurso) no cambia y se
puede quitar el enum por completo. Lo único que varía entre recursos es **el descanso
corto**:

```prisma
model CharacterResource {
  // ...campos existentes sin cambios (id, templateId, name, level, max, used)...
  shortRestRecoveryAmount Int     @default(0)     // usos que vuelven con descanso corto
  fullRecoveryOnShortRest Boolean @default(false)  // true = el corto repone todo (Brujo)
  // se elimina: recharge RechargeType
}
```

Equivalencias con los datos de hoy (migración de los valores existentes):
- `recharge: LONG` → `shortRestRecoveryAmount: 0, fullRecoveryOnShortRest: false` (sin cambio de comportamiento)
- `recharge: SHORT` → `fullRecoveryOnShortRest: true` (sin cambio de comportamiento)
- **Nuevo, antes no representable:** Segundo Aire → `shortRestRecoveryAmount: 1, fullRecoveryOnShortRest: false`

`usedAfterRest` (dominio) pasa a:
```ts
function usedAfterRest(r: ResourceState, rest: RestKind): number {
  if (rest === "LONG") return 0;
  if (r.fullRecoveryOnShortRest) return 0;
  return Math.max(0, r.used - r.shortRestRecoveryAmount);
}
```
Es una generalización, no una reescritura: los dos casos de hoy siguen dando el mismo
resultado, y el caso nuevo (parcial) antes no se podía representar.

## 3. Campo nuevo: `CharacterTemplate.class`

Para filtrar el catálogo por clase hace falta que el personaje declare una. Hoy no existe.

```prisma
enum CharacterClass {
  BARBARIAN
  BARD
  CLERIC
  DRUID
  FIGHTER
  MONK
  PALADIN
  RANGER
  ROGUE
  SORCERER
  WARLOCK
  WIZARD
}
```
`CharacterTemplate.class CharacterClass?` — opcional, para no romper personajes ya creados
y porque NPCs/monstruos modelados como `CharacterTemplate` no necesariamente la tienen.
Enum y no texto libre, mismo criterio que `CharacterType`/`CampaignRole`/`ActionKind` en el
resto del esquema — evita el drift de nombres que el catálogo busca justamente evitar.

**Reuso futuro:** este campo también hace falta para P5 (subida de nivel y dotes de clase),
así que conviene sumarlo una sola vez acá.

## 4. Catálogo de recursos de clase

Tabla de sistema, de solo lectura para el DM, cargada a mano por vos — mismo patrón que
`prisma/seed-data/monsters.json` + `seed-monsters.ts`.

```json
// prisma/seed-data/class-resources.json (forma propuesta, sin datos reales todavía)
{
  "class": "FIGHTER",
  "name": "Segundo Aire",
  "shortRestRecoveryAmount": 1,
  "fullRecoveryOnShortRest": false,
  "scalingNote": "2 usos a nivel 1, sube con el nivel — el DM pone el número real al clonar",
  "verified": false
}
```

**A propósito no se automatiza el cálculo del máximo.** Furia escala con nivel, Inspiración
de Bardo con el modificador de Carisma, Imposición de Manos es un pool de PV = nivel × 5 —
modelar eso para cinco clases es un motor de reglas en sí mismo. El catálogo trae el nombre,
la recarga y una nota de texto sobre cómo escala; **el DM sigue escribiendo el número final
al clonar**, mismo criterio que D-8/D-9 (competencias y espacios cargados a mano).

Ejemplos a cargar — **todos [verificar] contra el PHB 2024 antes de sembrarlos**, solo
Segundo Aire tiene fuente confirmada hoy:

| Clase | Recurso | Recarga (a confirmar) |
|---|---|---|
| Guerrero | Segundo Aire | parcial en corto (1), todo en largo — **[regla]** |
| Guerrero | Oleada de Acción | — **[verificar]** |
| Bárbaro | Furia | — **[verificar]** |
| Explorador | (a definir — "Marca del Cazador" es un conjuro, no un recurso de clase; confirmar qué recurso propio tiene el Explorador 2024) | — **[verificar]** |
| Paladín | Imposición de Manos | pool de PV, no usos discretos — **[verificar]**, puede necesitar forma de dato distinta |
| Bardo | Inspiración de Bardo | — **[verificar]** |

## 5. Tabla de espacios de conjuro

A diferencia de los recursos de clase, la cantidad de espacios por nivel **sale de una
tabla fija del libro**, sin modificadores de por medio — es automatizable sin un motor de
reglas.

- Una tabla de referencia por tipo de lanzador (completo / medio / Brujo), nivel → cantidad
  de espacios por nivel de hechizo (1–9). **[verificar]** contra el PHB 2024 antes de cargarla.
- **Brujo es un caso estructural distinto, no solo de recarga:** no tiene "espacios de nivel
  1, 2, 3…" simultáneos como un Mago — tiene **N espacios, todos del mismo nivel**, que sube
  con el personaje. Sus espacios además se recuperan con descanso **corto**
  (`fullRecoveryOnShortRest: true`), a diferencia de todos los demás lanzadores. Esto hay que
  tenerlo resuelto antes de sembrar el Brujo, no es una excepción menor.
- UI propuesta (DM, en `ResourcesManager`): botón "Completar espacios para nivel N" que crea
  o ajusta de una vez las filas de nivel 1..N según la tabla del tipo de lanzador del
  personaje — a diferencia del catálogo de recursos de clase, acá sí tiene sentido calcular
  el máximo automáticamente, porque no depende de nada además del nivel y el tipo de
  lanzador.

## 6. Flujo propuesto para el DM

En `ResourcesManager` (hoy: un form libre "Agregar recurso"), agregar un selector **"Elegir
del catálogo"**, filtrado por `character.class`:
1. DM elige un recurso del catálogo (o "espacios de conjuro" si el personaje es lanzador).
2. Se precargan nombre y regla de recarga; para recursos de clase, el DM escribe el máximo
   viendo la nota de cómo escala; para espacios, un botón completa la tabla del nivel actual.
3. El form libre existente queda para lo que no está en el catálogo (dotes, objetos
   mágicos, homebrew).

## 7. Explícitamente fuera de este diseño

- Multiclase.
- Cálculo automático del máximo de recursos de clase (Furia, Inspiración de Bardo,
  Imposición de Manos).
- Recursos de subclase (dados de superioridad de Maestro de Batalla, invocaciones de
  Brujo, etc.) — se suman al catálogo más adelante si hace falta, mismo patrón.
- Consumir el recurso automáticamente al usar una acción en combate — es el tema "recursos
  en combate" que esto precede, no reemplaza.

## 8. Antes de implementar

1. Confirmar contra el PHB 2024 cada fila de la tabla de §4 (hoy solo Segundo Aire está
   verificado) y la tabla de espacios de §5.
2. Decidir la forma de dato para recursos tipo "pool" (Imposición de Manos) — ¿un
   `CharacterResource` más con `max` en puntos de golpe en vez de "usos", o un tipo de
   recurso distinto? No resuelto en este documento.
3. Migración: agregar `CharacterTemplate.class` y reemplazar `CharacterResource.recharge`
   por los dos campos de §2.1 — aplicar primero en desarrollo, verificar, recién después en
   producción, mismo procedimiento que el resto de P2.
