# D&D Combat Tracker — Especificación del estado actual

> Documento de referencia para diseño UX/UI. Describe **lo que existe hoy en el código**, no un roadmap. Todo lo marcado como "no implementado" o "pendiente" es una ausencia real verificada en el repositorio, no un supuesto.

---

## 1. Stack y arquitectura

**Frontend**
- Next.js 16.2.4 (App Router) + React 19.2.4 + TypeScript.
- Tailwind CSS 4 para estilos (utilitario, sin sistema de diseño/tokens documentado — cada componente define sus propias clases).
- Estado de combate en cliente con **Zustand** (`src/stores/combatStore.ts`): se "hidrata" una vez desde el servidor al cargar la pantalla, y luego las mutaciones se aplican de forma **optimista** en el store antes de confirmarse contra la base de datos (con rollback automático si falla).

**Backend**
- No hay un backend/API separado. Toda la lógica de servidor vive en **Server Actions de Next.js** (archivos `"use server"` bajo `src/lib/actions/`), que hablan directo con la base de datos vía Prisma. No hay capa REST/GraphQL propia.

**Persistencia de datos**
- PostgreSQL alojado en **Supabase**, accedido con **Prisma ORM 5.22** (`prisma/schema.prisma`).
- 9 migraciones aplicadas hasta la fecha (la más reciente agrega nivel, bonificador de competencia, puntajes de característica y agotamiento a los templates de personaje).

**Sincronización en tiempo real entre dispositivos**
- **No implementada.** No hay websockets, Server-Sent Events ni polling en ningún punto del código.
- Cada pantalla solo se actualiza cuando *ella misma* dispara una acción (el DM ve reflejado lo que él mismo hace; el jugador ve reflejado lo que él mismo hace en `/spectate` vía `router.refresh()`).
- Consecuencia concreta: si el DM aplica daño a un personaje, el jugador dueño de ese personaje **no lo ve** hasta que recargue la página. Y viceversa: si un jugador se cura a sí mismo desde `/spectate`, el DM no lo ve en su pantalla sin recargar. No existe ningún mecanismo de "mesa compartida en vivo" todavía.

**Autenticación / manejo de sesión**
- **No implementada funcionalmente.** Existen las dependencias `next-auth` (v5 beta) y `bcryptjs` en `package.json`, y el modelo `User` (email, passwordHash, name) está definido en el schema de Prisma — pero:
  - No hay ninguna ruta de login/registro.
  - No hay archivo de configuración de next-auth ni `middleware.ts` propio.
  - Ninguna Server Action ni página verifica sesión o usuario.
  - Ningún dato de la app está filtrado por usuario: todo (templates, grupos, el combate activo) es visible y editable por cualquiera que tenga la URL.
- La "identidad" de un jugador durante un combate es una simple **cookie de navegador** (`player_participant_id` + `player_combat_id`, 7 días de duración) que se setea al elegir un personaje en `/join`. No hay validación de contraseña ni de identidad real — es solo una asociación auto-declarada.

---

## 2. Modelo de datos

### Entidades y relación entre ellas

```
User            (aislado — sin relación con ninguna otra entidad)

CharacterTemplate ──< CombatParticipant >── Combat ──< CombatLog
       │                                       
       └──< GroupMember >── Group
```

- **`User`**: existe en el schema pero no está conectado a nada. Ni `Combat`, ni `CharacterTemplate`, ni `Group`, ni `CombatParticipant` tienen una foreign key hacia `User`. En la práctica, hoy el usuario no existe como concepto dentro de la app.
- **`CharacterTemplate`**: la ficha reutilizable de un personaje/NPC/monstruo. Nunca se modifica durante el combate — sirve como "molde" del que se copian los valores iniciales.
- **`Combat`**: un encuentro. El código **fuerza que solo pueda existir un combate en estado `SETUP` o `ACTIVE` a la vez** en toda la aplicación (no hay noción de "mesas" o "campañas" en paralelo).
- **`CombatParticipant`**: la instancia viva de un `CharacterTemplate` dentro de un `Combat` específico. Acá vive **todo** el estado mutable del combate.
- **`CombatLog`**: registro de auditoría, solo de inserción (nunca se edita ni borra una entrada). Cada evento queda asociado a un round.
- **`Group` / `GroupMember`**: presets armados por el DM (por ejemplo, "el grupo de jugadores" o "una emboscada de goblins") con cantidad de cada template, para cargar participantes rápido al armar un combate.

Nota sobre el comentario en el schema: hay un comentario en el código que dice *"Campaign membership/roles are modeled separately (CampaignMember)"* — pero **ese modelo `CampaignMember` no existe en el schema**. Es una referencia a algo que nunca se implementó, no una funcionalidad real.

### Campos relevantes para combate

**`CharacterTemplate`**: `type` (PLAYER/NPC/MONSTER), `maxHp`, `currentHp` (nullable = arranca en HP máximo), `baseAc`, `initiativeBonus`, `level`, `proficiencyBonus`, `str/dex/con/int/wis/cha`, `exhaustionLevel` (0–6).

**`CombatParticipant`** (el que importa durante el combate en sí):
- Identidad: `displayName` (ej. "Wolf #1").
- Iniciativa: `initiative` (resultado final = tirada d20 + bonus), `turnOrder`.
- HP: `maxHp`, `currentHp`, `tempHp`.
- AC: `baseAc` + `acModifiers` (JSON, lista de `{source, value}` — ej. escudo, hechizo).
- Condiciones: `conditions` (JSON, lista de `{name}` — texto libre, no hay tabla de condiciones normalizada).
- Economía de acciones: `actionUsed`, `bonusUsed`, `reactionUsed` (booleanos, se resetean automáticamente al empezar el turno de ese participante).
- Estado: `isConscious`, `isStabilized`, `deathSaveSuccesses`, `deathSaveFailures`.
- Otros datos copiados del template pero **sin uso mecánico actual**: `level`, `proficiencyBonus`, `str/dex/con/int/wis/cha`, `speed`, `hitDice`.

**`CombatLog`**: `round`, `type` (DAMAGE / HEAL / CONDITION_ADDED / CONDITION_REMOVED / NOTE), `actorId`/`targetId` (opcionales), `amount`, `note`.

### Roles de usuario (DM vs jugador)

**No modelado.** No hay un campo "rol" en ningún lado. En la práctica:
- "Ser el DM" significa tener abierta la URL `/combat/[id]` (el panel de control completo).
- "Ser jugador" significa haber entrado por `/join` con el código de la partida y haber elegido un personaje — lo que solo te da acceso a `/combat/[id]/spectate`, mediado por la cookie descrita arriba.
- No existe ningún concepto de "soy DM en la campaña A y jugador en la campaña B", porque no existe el concepto de campaña.

---

## 3. Pantallas/rutas ya implementadas

| Ruta | Qué hace | Estado |
|---|---|---|
| `/` | Landing simple con dos links (Templates, Combat). | Funcional pero visualmente parece scaffolding inicial — no comparte el sistema visual (slate/indigo, cards redondeadas) del resto de la app. |
| `/templates` | Lista de `CharacterTemplate`, formulario de creación, filtro por tipo/nombre, panel de descanso (`RestPanel`). | Funcional, CRUD completo. |
| `/templates/[id]/edit` | Edita un template existente: nombre, HP, AC, bonus de iniciativa, nivel, bonif. de competencia, 6 puntajes de característica, agotamiento. El `type` queda bloqueado tras la creación. | Funcional. |
| `/groups` | Lista de grupos guardados, con filtro. | Funcional. |
| `/groups/new` | Alta de un grupo (nombre + descripción). | Funcional. |
| `/groups/[id]` | Detalle de grupo: agregar/quitar templates con cantidad. Tiene un botón "Start combat with this group" que enlaza a `/combat?groupId=...`. | El botón **no funciona hoy**: `/combat` no lee ese query param en ningún lado del código, así que el link no carga nada — hay que agregar los participantes manualmente en `/combat/[id]/setup`. |
| `/combat` | Lista de combates (en curso / finalizados) y formulario para iniciar uno nuevo. Solo permite un combate activo o en setup a la vez. | Funcional. |
| `/combat/[id]/setup` | El DM agrega participantes (uno por uno o cargando un grupo entero), ingresa manualmente la tirada de d20 de iniciativa de cada uno, y arranca el combate. | Funcional. No hay tirada de dados automática — el DM tiene que haber tirado físicamente y tipear el número. |
| `/combat/[id]` | Pantalla principal del DM durante el combate: orden de iniciativa, daño/curación, HP temporal, condiciones, modificadores de AC, toggles de acción/bonus/reacción, tiradas de salvación de muerte, reordenar turnos manualmente (drag & drop), avanzar turno, terminar combate (con o sin volcar el HP final a los templates). Muestra el código de invitación para jugadores. | Funcional, es la pantalla con más lógica de la app. |
| `/combat/[id]/spectate` | Vista del jugador. Solo accesible con la cookie seteada en `/join` (si falta o no coincide, redirige a `/join`). Muestra el mismo orden de iniciativa (solo lectura para los demás personajes) y permite expandir **únicamente el propio personaje** para aplicar daño/curación/condiciones y registrar tiradas de salvación de muerte. | Funcional. Sin ningún paso de aprobación del DM — lo que el jugador hace se escribe directo en la base de datos. |
| `/join` | Flujo de 2 pasos: ingresar el código de 6 caracteres (solo funciona si el combate está `ACTIVE`), luego elegir cuál personaje del roster es "el propio". | Funcional. |

Además, `src/components/HelloWorld.tsx` existe como archivo pero **no está importado en ninguna ruta** — es código huérfano, no una pantalla real.

---

## 4. Automatización de reglas ya resuelta

### Automático (calculado por código)
- AC total = `baseAc` + suma de `acModifiers`.
- Barra de HP y su color según porcentaje/consciencia.
- Aplicar daño: descuenta primero de `tempHp`, después de `currentHp`, nunca baja de 0, y marca inconsciencia automáticamente.
- Aplicar curación: sube hasta `maxHp`, detecta si el personaje "recupera la consciencia" y en ese caso resetea sus tiradas de muerte.
- Tiradas de muerte: 3 aciertos → estabilizado; 3 fallos → se saca al personaje de la rotación de turnos activa (sigue en la lista, pero se lo salta al avanzar turno).
- Orden de turnos: ordena por `turnOrder`, salta a quien tenga 3 fallos de muerte, resetea acción/bonus/reacción de quien entra al turno, incrementa el round al dar la vuelta completa.
- Cálculo de iniciativa al iniciar combate: tirada manual (d20) + `initiativeBonus` del template; empates se desempatan por mayor bonus.

### Manual (requiere que una persona lo resuelva y lo tipee)
- **No hay generación de números aleatorios en ningún lado del código.** Iniciativa, ataques, salvaciones y tiradas de muerte se resuelven fuera de la app (a la mesa, con dados físicos u otra herramienta) y el resultado se ingresa a mano.
- No hay tirada de ataque contra AC ni determinación de impacto/fallo — el daño se tipea directamente ya resuelto.
- No hay cálculo de salvaciones ni de DC — `str/dex/con/int/wis/cha`, `level` y `proficiencyBonus` existen como datos en el template/participante, pero **ninguna función del código los lee** para calcular un modificador o una dificultad.
- Las condiciones son etiquetas libres sin efecto mecánico: agregarlas/quitarlas no cambia nada más (no aplica desventaja, no bloquea acciones, etc.).
- El nivel de agotamiento (`exhaustionLevel`, 0–6) se guarda pero no dispara ningún efecto automático (ni reducción de velocidad, ni desventaja, etc.).

### Fuente de reglas/contenido
- No hay integración con ninguna API externa de reglas (SRD, 5etools, etc.).
- El único contenido "de reglas" hardcodeado es la lista de 14 condiciones comunes en `src/lib/constants/conditions.ts` (Blinded, Charmed, Deafened, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious) — aunque el campo también acepta texto libre.
- Todo lo demás (stats de monstruos, fichas de personaje) es lo que el DM tipea manualmente al crear un template.

---

## 5. Decisiones ya tomadas que restringen el diseño

- **Un solo combate global a la vez.** El servidor rechaza crear un combate nuevo si ya hay uno en `SETUP` o `ACTIVE`. No hay noción de múltiples mesas/campañas corriendo en paralelo.
- **Sin autenticación ni ownership de datos.** No existe "esto es mío" en ningún dato — cualquiera con la URL ve y edita todo. "Quién es el DM" no es un dato guardado, es simplemente quien está en `/combat/[id]` en lugar de `/spectate`.
- **La identidad del jugador es una cookie, no una cuenta.** Nada impide que dos navegadores reclamen el mismo personaje, ni que alguien elija un personaje que no es el suyo. Es un mecanismo de comodidad, no de permisos.
- **Los jugadores pueden editar su propio HP/condiciones sin mediación del DM.** No hay un paso de "el DM pide una tirada" o "el DM aprueba" — desde `/spectate` un jugador puede curarse, dañarse o agregarse condiciones a voluntad, y se escribe directo a la base.
- **No hay modo offline ni cache local.** Todas las mutaciones pegan contra la base de datos de inmediato (con UI optimista del lado del store, pero sin cola de reintentos). Si falla la conexión, se muestra un toast de error y se revierte lo optimista — no queda nada pendiente de reenvío.
- **No hay sincronización en vivo entre pantallas** (ver sección 1) — cualquier flujo de diseño que asuma "todos ven lo mismo en tiempo real" hoy no está soportado.
- **El template nunca se modifica durante el combate** — el HP final solo se vuelca al template si el DM elige explícitamente "End combat + save HP to templates"; si no, el próximo combate empieza desde el HP que tenía guardado (o full HP si es null).
- **El `type` de un template (Player/NPC/Monster) queda fijo para siempre tras crearlo.** Cambiar de categoría implica crear un template nuevo (los logs de combates viejos guardan el nombre como texto plano, así que el historial no se pierde, pero la ficha sí queda separada).
- **Nivel, bonif. de competencia, puntajes de característica y agotamiento existen como datos pero no tienen ningún efecto mecánico hoy.** Cualquier UI que dé a entender que estos valores "hacen algo" (afectan tiradas, daño, etc.) estaría adelantándose a lo que el sistema realmente calcula.

---

## 6. Pendientes conocidos

- **Sincronización en tiempo real entre dispositivos**: no implementada (ni websockets, ni polling, ni SSE). Cada pantalla solo se refresca con sus propias acciones.
- **Manejo de reconexión / estado offline**: no implementado — no hay cola de reintentos ni indicador de "sin conexión" distinto del toast de error genérico.
- **Autenticación / cuentas de usuario**: no implementada pese a que `next-auth` y `bcryptjs` están instalados como dependencias — no existe ninguna pantalla de login o registro.
- **Concepto de campaña / múltiples mesas**: no implementado — no hay modelo `Campaign` ni `CampaignMember`, pese a que un comentario en el schema los menciona como si existieran.
- **Roles por usuario** (ser DM en una campaña y jugador en otra): no implementado, y no es implementable hoy sin resolver primero el punto anterior.
- **El flujo "Start combat with this group" desde `/groups/[id]`** está roto: apunta a un query param que `/combat` nunca lee.
- **Automatización de tiradas** (iniciativa, ataque, salvación): no implementada — todo número se tipea a mano.
- **Efectos mecánicos de condiciones y de agotamiento**: no implementados — son etiquetas/números inertes hoy.
- **Aprobación del DM sobre cambios que hace un jugador a su propio personaje**: no implementada — se aplica de inmediato sin intermediación.
- **`/` (home) y `HelloWorld.tsx`** parecen scaffolding temprano: la home no comparte el sistema visual del resto de la app, y `HelloWorld.tsx` no está referenciado desde ninguna ruta.
