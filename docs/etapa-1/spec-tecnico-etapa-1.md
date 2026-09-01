# Etapa 1 — Auth + Campañas: spec técnico consolidado

> **Reemplaza a `etapa-1-decisiones-ux-tecnico.md`.** Este documento incorpora las decisiones tomadas después de las dos rondas de revisión sobre Stitch (`addendum-correcciones-stitch.md` y `addendum-v2-funcional-stitch.md`), que ya quedan obsoletos como fuente de verdad — su contenido está fusionado acá. Es el documento único a citar en el sprint.

---

## 1. Objetivo de esta etapa

Reemplazar el modelo actual de **"un combate global sin dueño"** por un modelo de **campañas con miembros y roles**, con autenticación real. Fuera de alcance: sincronización en tiempo real, automatización de tiradas/reglas, efectos mecánicos de condiciones (ver sección 7).

---

## 2. Modelo de datos

Basado en el schema actual (`prisma/schema.prisma`):

### Entidades nuevas
- **`User`** — pasa a ser el centro del modelo: `email`, `passwordHash`, `name`, **`emailVerified`** (DateTime? o boolean — campo nuevo y crítico, es el mecanismo de identidad que reemplaza la cookie de `/join`). OAuth (Google, Discord) vía `next-auth`.
- **`Campaign`** — `name`, `description?`, **`inviteCode`** (string, **6 caracteres alfanuméricos, sin guión, uppercase**, único, no expira, se genera al crear con reintento en caso de colisión), `ownerId → User`, `createdAt`.
- **`CampaignMember`** — `userId → User`, `campaignId → Campaign`, `role` (`DM` | `PLAYER`), `joinedAt`. Único por `(userId, campaignId)`. Un mismo `userId` puede tener filas con distinto `campaignId` y distinto `role`.

### Entidades existentes que cambian de scope
- **`Combat`** — agrega `campaignId` (FK, requerida). La restricción de "un solo combate en `SETUP`/`ACTIVE`" pasa de global a **por campaña**. ⚠️ Los combates existentes en datos de desarrollo sin `campaignId` van a romper con esta migración — limpiar o migrar antes de aplicar.
- **`CharacterTemplate`** — agrega `campaignId` (FK, requerida) y `ownerId → User` (nullable — null para NPCs/monstruos sin dueño). Un personaje no es portable entre campañas.
- **`Group` / `GroupMember`** — agregan `campaignId` (FK, requerida), mismo criterio.

### Lo que NO cambia
`CombatParticipant` y `CombatLog` no necesitan cambios de modelo — su lógica interna (HP, iniciativa, condiciones, economía de acciones) queda intacta.

---

## 3. Mapa de pantallas

```
Login/registro (detecta sesión activa)
        │
        ▼
Mis campañas (home post-login)
        │
        ├──▶ Crear campaña ──▶ Confirmación + código de invitación ──┐
        │                                                             │
        └──▶ Unirse con código ──▶ Verificación de email ──▶          │
             (o vía link mágico, salta el paso de código)  Elegir o   │
                                                             crear     │
                                                             personaje │
                                                                       ▼
                                                          Hub de campaña
                                                    (una sola ruta, layout por rol)
```

| Pantalla | Ruta | Rol | Descripción funcional |
|---|---|---|---|
| Login | `/login` | — | Email/contraseña + OAuth (Google, Discord) arriba. Si hay sesión activa, redirige directo a `/campaigns`. |
| Registro | `/register` | — | Nombre, email, contraseña + mismos OAuth. Dispara email de verificación al crear cuenta con email/contraseña (no aplica a OAuth). |
| Mis campañas | `/campaigns` | — | Lista de campañas del usuario con badge de rol (DM/Jugador). Indicador de combate activo si el usuario es DM. Botones "Crear campaña" y "Unirme". |
| Crear campaña | `/campaigns/new` | — | Formulario mínimo: nombre (obligatorio) + descripción (opcional). No pide personajes ni grupos en este paso. |
| Confirmación de campaña creada | — (paso post-creación) | DM | Muestra el `inviteCode` de 6 caracteres, botón copiar/compartir. Copy explícito: el código no vence y se usa una sola vez por jugador. |
| Unirse con código | `/join` | — | Input de 6 caracteres. **Bloqueado con banner si `emailVerified` es null**, con acción "Reenviar verificación" y submit deshabilitado. El link mágico (`/join?code=XXXXXX`) prellena el código y saltea este paso si el usuario ya está logueado y verificado. |
| Elegir o crear personaje | `/join/character` | Jugador (aún sin confirmar) | Lista de `CharacterTemplate` tipo jugador sin dueño en esa campaña. Opción de crear uno nuevo **siempre visible**, no solo cuando el roster está vacío. Al confirmar, crea el `CampaignMember` con `role = PLAYER`. |
| Hub de campaña | `/campaigns/[id]` | DM o Jugador | **Una sola ruta**, layout condicionado por `role` — no dos páginas separadas (ver decisión 6 revisada abajo). |

---

## 4. Decisiones confirmadas (log actualizado)

1. **El código de invitación es de campaña, no de combate**, 6 caracteres sin guión. Se usa una sola vez para unirse; después el jugador entra abriendo la app y viendo la campaña en su lista.
2. **El template de personaje pertenece a la campaña**, no es portable entre campañas.
3. **La identidad se resuelve con cuenta + email verificado, sin whitelist por email.** Bloqueo real en `/join` si no está verificado — no es solo copy, es un estado condicional obligatorio de la pantalla.
4. **El link de invitación es un atajo de UX, no un mecanismo de seguridad adicional.**
5. **Login/registro incluye OAuth (Google, Discord)**, priorizado visualmente arriba del formulario de email/contraseña.
6. **~~El hub de campaña difiere por rol solo en permisos, no en estructura visual~~ → revisado:** el hub muestra un bloque de estado arriba de la lista de combates en ambos roles — **agregado del grupo para el DM** (PV/Estamina/Condición promedio), **personaje propio para el jugador**. Es la misma estructura de componente, con datos distintos según rol; el DM además suma botón de creación y accesos a Personajes/Grupos, que el jugador no ve. Implementar como una sola ruta con lógica condicional, no como dos páginas que puedan divergir en estructura sin que sea una decisión consciente.
7. **Si el jugador no encuentra su personaje en el roster, puede crear el suyo propio ahí mismo**, siempre disponible.
8. **"Combate" no es una ruta de nivel superior — es una acción dentro del hub de campaña.**
9. **Nombre de la app ("GRIMOIRE" en las pantallas generadas): es placeholder**, no está definido como nombre de producto final.
10. **Se descartó la navegación global de 4 tabs** (Campaigns/Combat/Roster/Vault) que Stitch propuso por su cuenta — combate, personajes y grupos viven dentro de una campaña, no son secciones globales. Un ítem "Mis personajes" (vista agregada de personajes del usuario a través de campañas) queda como posible mejora futura, no construido en esta etapa.
11. **"Próxima sesión" (fecha)**: se muestra como dato placeholder en la card de campaña, sin flujo de programación real todavía.
12. **Idioma de la app: español**, por defecto y confirmado.

---

## 5. Reutilización de código existente

- CRUD de `CharacterTemplate` (`/templates`, `/templates/[id]/edit`) → pasa a vivir bajo la campaña.
- CRUD de `Group`/`GroupMember` (`/groups`, `/groups/new`, `/groups/[id]`) → mismo caso. Aprovechar para arreglar el bug conocido "Start combat with this group", ya que `/combat/[id]/setup` se toca de todos modos en esta etapa.
- `/combat/[id]/setup`, `/combat/[id]` (panel DM) y `/combat/[id]/spectate` — la lógica de combate no cambia, solo dejan de ser accesibles sin pasar por el hub de una campaña.

---

## 6. Pendiente de definir

- **Pantalla "Nuevo combate" desde el hub del DM** — no wireframeada en detalle; probablemente `/combat/[id]/setup` actual con un paso previo de selección de participantes de esa campaña.
- **Recuperación de contraseña** — sin definir, asumir flujo estándar de next-auth.
- **Concurrencia en `/join/character`** — qué pasa si dos personas crean el mismo personaje nuevo en simultáneo. No resuelto.

---

## 8. Bitácora de implementación

**D8/D9 (hub de campaña):** el mockup de Stitch mostraba varios campos sin respaldo en el schema — estamina, condición persistente del personaje, y un resultado de combate de tres vías (Victoria/Retirada/Resuelto). Se descartaron todos por el mismo principio: `CombatStatus` real es solo `SETUP | ACTIVE | FINISHED`, y no existe ningún campo de condición persistente en `CharacterTemplate` (`CombatParticipant.conditions` solo existe durante un combate activo). El hub muestra únicamente datos reales. C5 (`GET /api/campaigns/[id]`) se extendió — no se creó endpoint nuevo — para devolver `partyStatus` (DM: HP promedio y cantidad de jugadores, calculado sobre `CharacterTemplate` reclamados, no sobre `Group`) y `ownCharacter` (Jugador: su propio template). Distinción de modelo importante: `Group` es la herramienta de composición de encuentros del DM (NPCs/monstruos), no representa "quién está jugando realmente" — por eso el agregado de grupo usa templates reclamados, no `Group`.

**Botón "Nuevo combate":** se envió deshabilitado con etiqueta "(Próximamente)", sin destino — el flujo de creación de combate scopeado a campaña sigue siendo el pendiente de la sección 6, todavía sin ticket propio.

**D14 (Nuevo combate):** `/campaigns/[id]/combat/new` crea el Combat scopeado y redirige a `/combat/[id]/setup` (sin reescribir esa pantalla). `/combat` (lista global vieja, contradecía decisión 8) redirige ahora a `/campaigns`, mismo patrón que D6 con `/join`. Verificado en vivo que el participant-picker de `/combat/[id]/setup` ya filtraba correctamente por campaña (heredado de A5/A6) — no fue necesario tocar esa lógica. Gap conocido y explícitamente no resuelto acá, para no pisar D10-D12: dentro de `/combat/[id]/setup`, `/combat/[id]` y `/spectate` quedan links y redirects internos que todavía apuntan a `/combat` (ej. "← Back to combat") — rebotan a `/campaigns` sin contexto útil hasta que D10-D12 re-scopeen esas pantallas.

**D16 — hallazgo de seguridad más allá del ticket:** un guard de autorización puesto solo en `layout.tsx` no alcanza en Next.js App Router — el `page.tsx` hijo puede ejecutarse en paralelo para streaming, y su query corre igual aunque el layout decida no renderizar el contenido. Se confirmó en vivo: un usuario ajeno a una campaña recibía 404 visible, pero el payload RSC interno traía igual los datos completos de la campaña de otro. **Regla para toda ruta nueva bajo `/campaigns/[id]/...` de acá en adelante:** el guard de "¿es CampaignMember de esta campaña?" va como primera línea de cada `page.tsx`, antes de cualquier query — el guard del layout no es suficiente por sí solo y no debe asumirse como protección completa.

**S2-0 (Sprint 2) — la regla de D16 no cubría el vector de escritura:** el hallazgo de D16 fue sobre lectura (`page.tsx` bajo `layout.tsx`). Al auditar Sprint 2 se confirmó que las Server Actions de combate/participantes/templates/grupos (`src/lib/actions/{combat,participant,templates,groups}.ts`) no importaban `auth()` en absoluto — invocables directo, sin sesión ni membership, por cualquiera que conociera un id. `/combat/[id]/setup/page.tsx` tampoco tenía el guard de página que sí tienen `/combat/[id]` y `/spectate` (D11/D12). Cerrado así:

- Nuevo módulo `src/lib/auth/action-guards.ts` — contraparte de escritura de `guards.ts`: tira `UnauthorizedError("No autorizado")` en vez de `notFound()`, porque una acción no tiene página a la que devolver un 404. Exporta `requireCampaignMembership`/`requireCampaignDmAction` (nivel campaña), `requireCombatMembership`/`requireCombatDm` (resuelve la campaña dueña de un combate vía `Combat.campaignId`), `requireParticipantAccess` (DM: cualquier participante de su campaña; Jugador: solo el participante cuyo template tiene `ownerId === userId` — la misma regla `isMyCharacter` que `SpectateView` ya aplicaba solo del lado del cliente) y `requireParticipantDmAccess` (controles DM-only que comparten componente con el jugador: PV temporales, modificadores de AC, toggles de acción). Los guards de combate/participante devuelven `{ combatId, campaignId, membership }` resuelto para que la acción lo reutilice sin volver a consultar.
- `combat.ts` (mantiene su estilo de `throw`): guard en las 9 funciones. `advanceTurn`/`saveHpToTemplates` conservan su forma `{ ok, error }` atrapando `UnauthorizedError`. `endCombat` verifica que el `campaignId` recibido coincida con el real del combate. `removeParticipant` ahora chequea que el participante pertenezca efectivamente a `combatId`.
- `participant.ts` (`{ ok, error }`, nunca tira): un adaptador local `guard()` — `requireParticipantAccess` en daño/curación/condiciones/tiradas de muerte, `requireParticipantDmAccess` en PV temporales/mod. de AC/toggles de acción, `requireCombatDm` en `reorderParticipants`. `dealDamage`/`healParticipant`/`addCondition`/`removeCondition`/`recordDeathSave` ahora escriben `CombatLog.combatId` desde el participante verificado, no desde el `formData` del cliente (evita que un `combatId`/`targetId` desparejados inserten una entrada de bitácora en un combate ajeno).
- `templates.ts`/`groups.ts` (form-state `{ error }`): un adaptador local `requireDm()` en cada uno, campaña resuelta desde el registro del template/grupo. `longRest`/`shortRest` ahora exigen que todos los ids existan y resuelvan a una única campaña antes de tocar nada. `removeGroupMember` chequea que el miembro pertenezca a `groupId`.
- `/combat/[id]/setup/page.tsx` suma el mismo guard de página que D11/D12: no-miembro → `notFound()`, Jugador → redirige a `/spectate` (setup es DM-only).
- Verificado con `npx tsc --noEmit`, `npm run build` y ESLint sobre los archivos tocados — los tres limpios.

**Cierre de Épica E (QA y casos borde):** los 5 ítems se revisaron contra el código real, no por inspección superficial de pasadas anteriores. Detalle de cómo se verificó cada uno:

- **E1** — código: el botón "Crear mi personaje" en `CharacterPicker.tsx` está condicionado únicamente por el estado local `showCreateForm`, nunca por `characters.length`. En vivo: se sembró una campaña con un roster de 2 `CharacterTemplate` tipo `PLAYER` sin dueño y se pidió `/join/character?campaignId=...` autenticado como un usuario sin membresía — el HTML devuelto trae el roster completo **y** el botón de crear, simultáneamente. ✅
- **E2** — se forzó una colisión real: se insertó un `Campaign` con `inviteCode = "AAAAAA"` y se mockeó `Math.random` para que la primera pasada de `generateInviteCode()` produjera exactamente ese valor. Se llamó a la función real `generateUniqueInviteCode()` (import directo del módulo, sin reescribir su lógica) — detectó la colisión contra la fila sembrada, reintentó, y devolvió un código distinto (`"SSSSSS"`) sin lanzar excepción. `Math.random` se invocó 12 veces (2 pasadas de 6), confirmando que el loop de reintento corrió. ✅
- **E3** — código: ni `COMBAT_DETAIL_INCLUDE` (query) ni `CombatView`/`SpectateView` (render) filtran por `isConscious`; ambos aplican `opacity-70` condicionalmente sin excluir la fila. En vivo: se sembró un combate `ACTIVE` con un participante consciente y uno derrotado (`currentHp: 0, isConscious: false`). En `/combat/[id]/spectate` (server-rendered con props reales) se confirmó ambos presentes y `opacity-70` aplicado solo al derrotado. En `/combat/[id]` (panel DM) el mismo chequeo por curl **no** es concluyente: `CombatView` lee de un store de Zustand que se hidrata en un `useEffect` (`CombatStoreInitializer`), así que el HTML de una petición sin JS muestra el estado inicial vacío del store ("Todavía no hay participantes...") aunque los datos reales sí viajan en el payload para hidratar — se confirmó por lectura de código que la lógica de filtrado es idéntica a la de spectate, pero el comportamiento renderizado del panel DM específicamente **no se pudo confirmar en vivo sin navegador real** (mismo limitante que E4). ✅ por código + spectate en vivo; panel DM sin verificación en vivo.
- **E4** — sin verificar en vivo. La extensión de Chrome no está conectada en esta sesión (`tabs_context_mcp` devuelve "Browser extension is not connected"); se reintentó justo antes de este cierre y sigue sin disponibilidad. Queda pendiente de revisión manual en navegador real.
- **E5** — resuelto en D16 (ver más arriba): `startCombatFromGroup` crea el combate scopeado a la campaña del grupo, copia participantes vía `addParticipantsFromGroup` con stats reales, y redirige a `/combat/[id]/setup`. Verificado en vivo end-to-end en la pasada de D16.

**S2-12 — "de quién es el turno" difería entre el panel DM y `/spectate`:** `domain/combat/rules.ts` ya tiene la función canónica del cálculo de turno — `computeCurrentActor` (con `activeTurnOrder`), que filtra participantes por `deathSaveFailures < 3` y ordena por `turnOrder`. Esa es la regla real: un combatiente inconsciente-pero-no-muerto sigue en la rotación de iniciativa hasta acumular 3 fallos de salvación de muerte (ese turno es la señal para tirar la salvación). El panel DM (`CombatView`) y el store ya la usaban bien. `spectate/page.tsx` reimplementaba el cálculo por su cuenta (`combat.participants.filter((p) => p.isConscious)[currentTurnIndex]`), con un comentario que lo marcaba como deuda conocida ("intentionally indexes by isConscious … pre-existing behavior, kept as-is"). `isConscious` pasa a `false` apenas alguien cae a 0 PV, así que con cualquier combatiente caído-pero-vivo en la lista el array filtrado por `isConscious` y el orden canónico divergen, y el turno resaltado quedaba distinto entre el panel y spectate. Cerrado en el commit `6d5d25b`:

- `spectate/page.tsx` y `campaigns/[id]/page.tsx` (`ActiveCombatCard` del hub) reemplazan su cálculo ad-hoc por `computeCurrentActor(participants, currentTurnIndex)` sobre el mismo objeto de `mapCombatDetail` que consume el panel DM. El tipo `ActiveCombat.participants` del hub se ensanchó para llevar `turnOrder` + `deathSaveFailures` (el API ya los devolvía).
- Se borró el getter `consciousParticipants` sin uso de `combatStore.ts` — residuo de la misma confusión. `SpectateView` ahora distingue "Es tu turno — tirá tu salvación de muerte" cuando el turno cae en el personaje caído del propio jugador.
- No se tocó `CombatView`/`CurrentTurnPanel`/`rules.ts` — ya estaban bien; esto fue solo alinear los consumidores desactualizados.
- Búsqueda de otros cálculos de "turno actual" con lógica propia (filtros por `isConscious` cerca de `currentTurnIndex`): no hay más. Los cuatro consumidores (`CombatView`, `combatStore`, `spectate/page`, `campaigns/[id]/page`) usan `computeCurrentActor`. El único `filter((p) => p.isConscious)` restante cerca del tema es el contador "N en pie" del header de `CombatView` (display, no cálculo de turno).

Verificación (mismo criterio que E2/E3 — funciones reales importadas directo, sin reescribir su lógica). Combate `ACTIVE` sembrado en la DB real, `currentTurnIndex = 1`, cuatro participantes en `turnOrder` asc tal como los devuelve `COMBAT_DETAIL_INCLUDE`: Aragorn (`0`, consciente), **Boromir (`1`, `isConscious: false`, `deathSaveFailures: 2` — caído, no muerto)**, Legolas (`2`, consciente), Gollum (`3`, `deathSaveFailures: 3` — muerto); Boromir es el `CharacterTemplate` del jugador que mira `/spectate`. Se leyó con `getCombatDetail` → `mapCombatDetail` (idéntico a lo que reciben `SpectateView` y el store del panel) y se corrió la resolución server-side de cada pantalla:

- **(1) Panel DM** — `computeCurrentActor(mapped.participants, 1)` → **Boromir**; sin cambios respecto de antes del fix (`CombatView` ya llamaba esta función).
- **(2) `/spectate` post-fix** — `computeCurrentActor(mapped.participants, 1)` → **Boromir**, mismo `participantId` que el panel. El cálculo viejo (`participants.filter(isConscious)[1]`) daba **Legolas**; con `currentTurnIndex = 2` era peor (`undefined → null`: spectate no resaltaba a nadie mientras el panel sí). Trace manual del índice y ejecución en vivo coinciden.
- **(3) Muerto excluido en ambos lados** — Gollum (`deathSaveFailures === 3`) nunca lo devuelve `computeCurrentActor` ni lo alcanza `computeAdvanceTurn`: queda fuera de `activeTurnOrder`. Se recorrió una ronda completa con `computeAdvanceTurn` (idx 0→1→2→wrap, `round` 1→2) y no aparece en ningún paso.

El render final del highlight de fila del panel DM (`actor?.id === p.id`) no se verifica por curl — `CombatView` se hidrata desde Zustand en un `useEffect` (mismo limitante que E3/E4, sin navegador en esta sesión) — pero recibe el mismo objeto de `mapCombatDetail` sobre el que se corrió `computeCurrentActor` acá, así que la resolución del actor es idéntica por construcción. ✅ por código + trace de índice + ejecución server-side en vivo; render del panel DM sin navegador.

**S2-1 + S2-2 — header de navegación global (reemplazo del `Navbar.tsx` borrado en Sprint 1):** el `Navbar.tsx` viejo era la barra de 3 tabs globales (Templates/Groups/Combat) que la decisión 10 descartó, además de estar sin estilar (fondo blanco, colores slate). El header nuevo **no** es una barra de tabs: es solo wayfinding — wordmark **GRIMOIRE** (placeholder, decisión 9) con link a `/campaigns`, y el menú de usuario. Auditoría previa de la estructura de layouts post-D16:

- Layouts reales hoy: `app/layout.tsx` (raíz: `<html>/<body>`, fuentes, tema — envuelve también `/login`·`/register`·`/join`); `app/campaigns/layout.tsx` (solo el contenedor `max-w-lg`); `app/campaigns/[id]/templates/layout.tsx` y `.../groups/layout.tsx` (guards D16 `requireCampaignDm`, sin markup). No existe `app/campaigns/[id]/layout.tsx` ni ningún layout bajo `/combat`.
- El enforcement de sesión está partido: `proxy.ts` (matcher `/`, `/campaigns/:path*`, `/join/:path*`) redirige a `/login`; **no cubre `/combat/*`**, donde cada `page.tsx` hace su propio `auth()` + `CampaignMember` + gate de rol (regla D16: el guard vive en el `page.tsx`, no en un layout plano).

Montaje elegido — el header va en **dos** `layout.tsx`, con un solo componente compartido:

- `src/components/nav/AppHeader.tsx` (Server, `async`) — lee `auth()` una vez, renderiza el wordmark + `<UserMenu>` (solo si hay sesión). Sin guard propio.
- `src/components/nav/UserMenu.tsx` (`"use client"`) — `@radix-ui/react-dropdown-menu` (unstyled) vestido con tokens Etapa 1: color plano, radios 2–4px (`rounded-gothic-sm/md`), bordes por `ring-1`, `font-gothic-body` (Hanken Grotesk) en todo string — nada de `font-mono` ni texturas. Trigger = botón-ícono con la inicial; contenido = nombre + email (no interactivo) · separador · **"Cerrar sesión"** → `signOut({ redirectTo: "/login" })` de `next-auth/react`.
- `src/app/campaigns/layout.tsx` — editado: `<AppHeader/>` arriba del contenedor `max-w-lg` existente.
- `src/app/combat/layout.tsx` — **nuevo**, render-only (`<AppHeader/>{children}`), **sin guard** (proxy no cubre `/combat`; los guards siguen en cada `page.tsx`). Cada página de combate mantiene su propio contenedor `max-w-lg`, así que el layout no agrega wrapper.

Descartado: montarlo en el root layout (pondría el menú de usuario sobre `/login`·`/register`); un route group `(app)/` (exigía `git mv` de ~20 archivos sin ganancia funcional). Los back-links contextuales (`← Campaña`, `← Volver a…`) quedan como están — el header es wayfinding global adicional, no los reemplaza.

`signOut()` de `next-auth/react` funciona **sin `<SessionProvider>`** (no hay ninguno en el repo): con `redirect: true` (default) solo hace `getCsrfToken()` → `POST /api/auth/signout` → `window.location.href`; nunca toca el contexto de sesión de React (`node_modules/next-auth/react.js:187`). No se agregó ninguna dependencia fuera de `@radix-ui/react-dropdown-menu` (ya instalada) — el manejo de errores existente (`useState` + banner inline) quedó intacto.

Sin desvíos respecto al plan aprobado: no hizo falta `<SessionProvider>`, el detector de Impeccable no forzó ningún cambio, y los 4 archivos quedaron como se planearon. Único efecto no planeado explícitamente de antemano: el cambio `static → dynamic` de `/campaigns/new` y `/combat` (previsto como riesgo en la auditoría, confirmado en el build).

Verificación: `npx tsc --noEmit` limpio; ESLint sobre los archivos tocados limpio; `npm run build` OK — `/campaigns/new` y `/combat` pasan de `○ static` a `ƒ dynamic` (esperado: `AppHeader` lee `cookies()` vía `auth()`; ambas son rutas auth-gated que no deberían prerenderarse igual), ninguna otra ruta cambia. Detector de Impeccable sobre `AppHeader.tsx` + `UserMenu.tsx`: sin hallazgos (verificado en la misma corrida que sí marca `border-l-4` en `SpectateView.tsx`, o sea el detector procesó los archivos). Render en navegador (header presente, wordmark → `/campaigns`, dropdown se abre, logout corta sesión y redirige a `/login`): verificado por el test e2e de Playwright (ver más abajo) — pasó.

**Tooling — Impeccable (fuera del backlog original):** se sumó [Impeccable](https://github.com/pbakaus/impeccable) como skill de agente scopeado al proyecto (`.claude/skills/` + hook en `.claude/settings.local.json`), para auditar la UI generada contra patrones de "AI slop" (fuentes genéricas, gradientes, cards sobre-anidadas, over-rounding). No es dependencia de la app — cero peso en runtime, no toca `package.json`.

**Tooling — Playwright e2e (fuera del backlog original):** cierra el gap recurrente de E4 ("sin acceso a navegador real para verificar en vivo"). `@playwright/test` como devDependency, config en `playwright.config.ts` (`testDir: e2e/`, arranca `npm run dev` en :3000, Chromium). `e2e/global-setup.ts` siembra idempotentemente un usuario + campaña de prueba (`e2e@grimoire.test`, campaña `E2E Test Campaign`) en la DB de `.env` vía Prisma — no hay modo mock, los tests ejercitan las Server Actions reales. `e2e/header.spec.ts` hace dogfooding de S2-1/S2-2: login → header en `/campaigns` → wordmark vuelve desde el hub → logout corta sesión y `/campaigns` rebota a `/login`. Selectores por `data-testid` agregados a los componentes como convención. Cómo correr: `npx playwright test` (documentado en `CONTRIBUTING.md`).

**S2-4 — inviteCode visible en el hub de campaña (vista DM):** hasta ahora el código de invitación solo se mostraba en la pantalla de confirmación post-creación (D5). `GET /api/campaigns/[id]` ya lo devolvía para el rol DM desde Sprint 1 (`route.ts:80`, spread condicional `...(isDM ? { inviteCode } : {})`); `Campaign.inviteCode` es `@unique` NOT NULL, así que estructuralmente siempre tiene valor — confirmado además en runtime (las 5 campañas en la DB lo tienen, y el test e2e nuevo lo lee renderizado en el hub). El tipo `HubData.campaign.inviteCode?` ya estaba, solo faltaba consumirlo.

- **Nuevo `src/components/campaigns/InviteCodeChip.tsx`** (`"use client"`) — extrae el `useState("copiado") + navigator.clipboard.writeText` con fallback silencioso (`select-all` sobre el `<span>`) que estaba inline en `CampaignCreated`. Variante `size`: `lg` (box grande + botón full-width, la UX de D5 sin cambios) y `sm` (fila compacta: código + botón "Copiar"). Mismos tokens (`gothic-surface-low`, `gothic-primary`, `font-gothic-data` con tracking amplio, radios 2–4px). `data-testid`: `invite-code-chip` / `invite-code-value` / `invite-code-copy`.
- `campaigns/new/page.tsx` — `CampaignCreated` ahora usa `<InviteCodeChip size="lg" label="Código de invitación">`; se borró el handler duplicado.
- `campaigns/[id]/page.tsx` — sección propia justo debajo de `StatusBlock`, gate `data.role === "DM" && data.campaign.inviteCode` (mismo criterio que `DmQuickAccess`), con `<InviteCodeChip size="sm">`.

Verificación: `npx tsc --noEmit`, `npm run build`, ESLint — limpios. Detector de Impeccable sobre `InviteCodeChip.tsx` — sin hallazgos. Test e2e nuevo `e2e/invite-code.spec.ts` (DM ve el chip con el código en el hub): **pasó**.

**S2-3 — editar campaña, DM-only:**

- **`PATCH` en `src/app/api/campaigns/[id]/route.ts`** (mismo archivo que el `GET`): mismo guard inline que el `GET` + chequeo de rol → `403 NOT_DM` (consistente con `NOT_A_MEMBER`). Valida `name` (no vacío), `description` opcional, `prisma.campaign.update`, devuelve el campaign. Verificado standalone por `curl` (200 con sesión válida, 3.9 s incluyendo compilación en frío).
- **Server Action `updateCampaign`** en `src/lib/actions/campaigns.ts`, form-state (`{ error? }`). **Desvío del plan** (que pedía el patrón `createCampaign`: acción delgada que hace `fetch` a su propia route): ese patrón deadlockeó el dev server bajo la corrida e2e — el `fetch` de una Server Action de vuelta a una route del mismo origen compite por los mismos workers de request limitados, y apilarlo con los self-fetch del hub y de la página de edición agotó el pool. `updateCampaign` escribe por Prisma con `requireCampaignDmAction` (lo que ya hacen las mutaciones DM-only de `templates.ts`/`groups.ts`, S2-0). El `PATCH` sigue existiendo como endpoint REST documentado; la acción no lo proxea. En éxito hace `redirect()` al hub desde el server (como el flujo de edición de templates), en vez de devolver un flag para que navegue el cliente.
- **Nueva ruta `src/app/campaigns/[id]/edit/`** — `page.tsx` (server: `requireCampaignDm` → `notFound()` antes de leer nada, igual que templates/groups; precarga por Prisma directo, **otro desvío** de "fetch a GET" por la misma razón de deadlock) + `EditCampaignForm.tsx` (`"use client"`, `useActionState` + `inputClass` compartido con `campaigns/new`, `defaultValue` con los valores actuales). Al guardar vuelve a `/campaigns/[id]`.
- **Link "Editar"** en el hub (`campaigns/[id]/page.tsx`), al lado del título, gate `data.role === "DM"` — fuera de `DmQuickAccess` (esa sección es Personajes/Grupos/Nuevo combate).

Verificación S2-3: `npx tsc --noEmit`, `npm run build`, ESLint — limpios (3 warnings preexistentes en `CombatRow`/`SpectateView`, ninguno nuevo). Impeccable sobre `EditCampaignForm.tsx` + `edit/page.tsx` — sin hallazgos. Test e2e nuevo `e2e/edit-campaign.spec.ts` (DM renombra `E2E Editable Campaign`, verifica que persiste tras redirect y en un `goto('/campaigns')` fresco): **pasó**. Nota: hubo que subir el `timeout` de Playwright a 90 s — un flujo con varias navegaciones en modo dev (compilación on-demand por ruta) revienta el default de 30 s antes de que algo falle de verdad. **Suite completa: 3/3 pasan** (`npx playwright test`).

**S2-7 — `/profile` (nombre, email, lista de campañas; edición de nombre):** territorio nuevo — no había nada de "editar perfil de usuario". Sigue la convención de S2-3 tal como el ticket la pide (acción delgada + ruta REST real), no el Prisma directo de combat/participant. El email y la contraseña quedan **explícitamente fuera** (interactúan con `emailVerified`).

- **`src/app/api/profile/route.ts`** — `GET` → `{ id, name, email }`; `PATCH` → valida `name` no vacío, actualiza solo `name`, devuelve `{ id, name, email }`. Ambos: sesión requerida (`401 UNAUTHENTICATED`), sin chequeo de rol (es sobre el propio usuario). Verificado por `curl`: `GET` 200 con sesión / 401 sin; `PATCH` 200 con nombre válido / 400 `NAME_REQUIRED` con vacío.
- **`src/lib/actions/profile.ts` — `updateProfile`** — thin action (`{ error? }`), `fetch` a `PATCH /api/profile` con cookie reenviada, `redirect("/profile")` en éxito. Este sí usa el patrón fetch (lo que el ticket pedía y `updateCampaign` no pudo por el deadlock e2e); acá no hay test e2e que apile navegaciones, y es el mismo patrón que `createCampaign`, en uso real.
- **`src/app/profile/page.tsx`** (+ `EditNameForm.tsx` client, `+ layout.tsx`) — server component: `fetch` a `GET /api/profile` (nombre fresco de DB — la sesión JWT no se refresca) **+** `GET /api/campaigns` reusado tal cual (el mismo call que `campaigns/page.tsx`). Nombre editable (`useActionState` + `inputClass` compartido), email solo lectura, lista de campañas compacta (link + badge de rol). `layout.tsx` monta `<AppHeader/>` + contenedor `max-w-lg` — `/profile` es su propio subárbol autenticado, igual que `combat/layout.tsx` en S2-1.
- **`src/proxy.ts`** — `/profile` sumado al `matcher` y a `PROTECTED_PREFIXES`. Es un gate de sesión-solamente (sin membership ni rol), la misma categoría que `/campaigns` y `/join` — por eso va acá y no como `auth()` por página (ese patrón es para `/combat/*`, que necesita más que la sesión). Verificado: `/profile` sin sesión → `307` a `/login`.
- **`src/components/nav/UserMenu.tsx`** — link "Mi perfil" → `/profile` (arriba de "Cerrar sesión", con separador). Fuera del ticket original, confirmado con el usuario. `data-testid="user-menu-profile"`.

Limitación conocida (no arreglada, fuera de alcance): el nombre en el header (`AppHeader` → `auth()` → `session.user.name`) queda desactualizado tras editar el perfil hasta el próximo login — la sesión JWT no se refresca. `/profile` sí muestra el nombre fresco (lee de DB). Arreglarlo implica tocar el ciclo de sesión de next-auth.

Verificación S2-7: `npx tsc --noEmit`, `npm run build`, ESLint — limpios. Impeccable sobre `page.tsx` / `EditNameForm.tsx` / `layout.tsx` / `UserMenu.tsx` — sin hallazgos. Flujo verificado por `curl` (login → `GET`/`PATCH /api/profile`, render de `/profile`, redirect de proxy). Sin test e2e nuevo (el ticket no lo pidió); la suite existente **3/3 sigue pasando** con el cambio en `UserMenu`.

**S2-6 — ficha del personaje fuera de combate (jugador dueño):** territorio nuevo. **Alcance decidido:** ficha de **solo lectura** de los stats reales + una migración chica para un único campo editable (`notes`). Los stats numéricos (nivel, bono de competencia, STR/DEX/CON/INT/WIS/CHA, agotamiento, PV/CA/iniciativa) siguen siendo **DM-only vía `/campaigns/[id]/templates/[templateId]/edit` (D13)** — esta pantalla los muestra pero no los edita, tal como pide el propio ticket (que un jugador no se automodifique a mitad de campaña).

- **Migración `add_character_notes`** — `notes String?` en `CharacterTemplate` (`ALTER TABLE "CharacterTemplate" ADD COLUMN "notes" TEXT;`), aplicada a la DB de Supabase con `prisma migrate dev`. Sin límite de longitud a nivel DB; el tope (`MAX_NOTES_LENGTH = 2000`) se valida en la Server Action. La constante vive en `src/lib/constants/character.ts`, **no** en el módulo `"use server"` — un archivo `"use server"` solo puede exportar funciones async, y el form cliente también la importa (contador de caracteres).
- **Guard nuevo `requireTemplateOwner(templateId)` en `src/lib/auth/action-guards.ts`** (familia S2-0). **Criterio distinto del resto de los guards:** ser DM de la campaña **no alcanza** — las notas son personales del jugador, no un dato de gestión del DM. El único pase es `CharacterTemplate.ownerId === userId`. Tira `UnauthorizedError`; devuelve `{ templateId, campaignId, ownerId }`.
- **`src/lib/actions/character.ts` — `updateCharacterNotes(templateId, notes)`** — Prisma directo con el guard de arriba (como `templates.ts`/`groups.ts` en S2-0), **no** el patrón acción-delgada + `PATCH` REST de S2-3/S2-7: acá la autorización es "dueño de un recurso", no gestión de campaña, y el ticket pedía explícitamente usar `action-guards.ts`. Valida longitud, actualiza solo `notes` (vacío → `null`, si no conserva el formato del jugador), `revalidatePath`.
- **Nueva ruta `src/app/campaigns/[id]/character/`** — `page.tsx` (server) + `CharacterNotesForm.tsx` (`"use client"`, `useTransition` + contador + botón guardar, patrón `RestPanel`/`TemplateCard`). La ficha reusa el look de `StatBox` del hub. En "Características" se muestra el modificador debajo del score (`14` / `+2`) — presentación de ficha, no cálculo de reglas (ninguna función de la app lee esos scores). El guard de membership va **inline en el `page.tsx`**: esta ruta es hermana de `templates/`/`groups/`, no hereda el `layout.tsx` con `requireCampaignDm` de aquellas. No-miembro → `notFound()` (mismo enmascarado que hub/spectate).
- **Qué ve un DM en `/campaigns/[id]/character`:** el ticket deja "a definir" la variante "DM ve la ficha de cualquier jugador" — **no se construyó**. Un DM pasa el guard de membership, después `findFirst({ campaignId, ownerId: userId })` devuelve `null` (los DM no reclaman templates de jugador) → cae en el mismo empty state que un jugador sin personaje: *"No tenés un personaje asignado en esta campaña."* Sin redirect, sin error crudo, **sin caso especial**. Razón: es la verdad literal, no agrega ramas, y si más adelante se suma "DM ve a sus jugadores" entra como una rama más acá en vez de deshacer un redirect. Borde: si un DM llegara a poseer un template propio en su campaña vería esa ficha — su propio dato, inofensivo.
- **Link "Ver ficha completa →"** en `StatusBlock` del hub (`campaigns/[id]/page.tsx`, rama Jugador, con personaje).

**Pendiente sin resolver — cobertura Playwright de esta ficha:** **no está hecha, no asumir que sí en una auditoría futura.** El seed de e2e (`e2e/global-setup.ts`, de S2-1..S2-4) crea **solo un usuario DM sin ningún `CharacterTemplate` propio**, así que el caso feliz (ver una ficha real + guardar una nota) no es alcanzable sin **extender los fixtures compartidos** — `global-setup.ts` + `test-data.ts` + `auth.ts` — para sembrar un usuario PLAYER + un template `type: PLAYER` con `ownerId` propio, más un spec nuevo. Toca fixtures de los que dependen los otros specs, por eso no se hizo en esta pasada.

Verificación S2-6: `npx tsc --noEmit`, `npm run build` (ruta `/campaigns/[id]/character` registrada), ESLint — los tres limpios. Requirió `npm ci` antes: el commit `9fa1e7f` sumó `@radix-ui/react-dropdown-menu` y `@playwright/test` a `package.json`/lock pero `node_modules` estaba desactualizado, lo que rompía `tsc`/`build` con "Cannot find module" en `UserMenu.tsx` y `e2e/*` — no relacionado con S2-6. Suite e2e existente no corrida; el único cambio de UI (link en el hub) está en la rama Jugador-con-personaje, que el usuario DM del seed nunca ejecuta.

**S2-10 — `/login` y `/register` no redirigían con sesión activa:** contradecía la sección 3 de este spec ("si hay sesión activa, redirige directo a `/campaigns`") — `proxy.ts` sólo hace ese chequeo para `/`, no para estas dos rutas (no están en su `matcher`). Fix: `const session = await auth(); if (session?.user?.id) redirect("/campaigns");` al inicio de ambos `page.tsx`, el mismo patrón (`session?.user?.id`) que ya usan `/combat/[id]`, `/spectate` y `action-guards.ts`. Ambas páginas ya eran dinámicas (usan `searchParams`), así que el `await auth()` no cambia el modo de render. Verificación: `npx tsc --noEmit`, `npm run build`, ESLint — limpios.

**S2-11 — logs de combate bilingües:** los `CombatLog.note` que arma `src/lib/actions/participant.ts` estaban en inglés (`"X fell unconscious"` en `dealDamage`, `"X regained consciousness"` en `healParticipant`, `"X gained/lost condition: Y"` en `addCondition`/`removeCondition`, y las 4 ramas de salvación de muerte en `recordDeathSave`), contra la decisión 12. Traducidos a español neutro (3ª persona, sin voseo), alineados con el vocabulario que ya usan `DeathSaveTracker` y el banner de spectate ("salvación de muerte", "superó/falló", "se estabilizó", "murió"). **El fix fue exclusivamente en los strings generados server-side — no se tocó ningún componente de UI:** `CombatLog.tsx` ya renderiza sus plantillas (`DAMAGE`/`HEAL`/`CONDITION_*`/`NOTE`) en español y sólo concatena/muestra el `note` recibido, así que estaba correcto; el único archivo del commit es `participant.ts`. Ningún spec de Playwright hace match por el texto de estos logs (grep sobre `src/` y `e2e/` — cero coincidencias), así que no hubo test que actualizar. Verificación: `npx tsc --noEmit`, `npm run build`, ESLint — limpios.

---

## 7. Explícitamente fuera de alcance de esta etapa

- Sincronización en tiempo real entre dispositivos.
- Automatización de tiradas (iniciativa, ataque, salvación) — todo se tipea a mano. El bloque de "Acciones" con fórmulas de daño que aparece en la ficha de personaje generada es **referencia visual estática**, sin lógica de tirada conectada — Stitch se adelantó a esto por su cuenta, no construir interactividad sobre ese bloque en esta etapa.
- Efectos mecánicos de condiciones y agotamiento.
- Aprobación del DM sobre cambios que hace un jugador a su propio personaje en combate.
- Modo offline / cola de reintentos.