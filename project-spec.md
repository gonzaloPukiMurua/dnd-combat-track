# D&D Combat Tracker — Especificación del estado actual

> Documento de referencia para diseño UX/UI. Describe **lo que existe hoy en el código**, no un roadmap. Todo lo marcado como "no implementado" o "pendiente" es una ausencia real verificada en el repositorio, no un supuesto.
>
> **Estado reflejado:** post Sprint 1 (Épicas A–E de `docs/etapa-1/`) **y Sprint 2** (tickets S2-0 a S2-12 de `docs/etapa-2/sprint-2-backlog.md`, todos cerrados salvo S2-5). Sprint 1 pasó el modelo de "un combate global sin dueño" a **campañas con miembros, roles y autenticación real**. Sprint 2 no tocó lógica de reglas de D&D: cerró huecos de UX (navegación, cuenta, gestión de campaña) y deuda técnica de seguridad detectada al regenerar este documento.
>
> La sección 7 recopila deuda técnica e inconsistencias que **no** están en `docs/etapa-1/spec-tecnico-etapa-1.md` §8 (bitácora). Donde algo contradice lo que ese documento da por cerrado, está marcado con **⚠️ Contradice bitácora**.

---

## 1. Stack y arquitectura

**Frontend**
- Next.js **16.2.4** (App Router) + React **19.2.4** + TypeScript.
- ⚠️ Esta versión de Next tiene cambios de convención respecto de lo habitual (ver `AGENTS.md`): el archivo `middleware.ts` se renombró a **`src/proxy.ts`** (mismo comportamiento, runtime Node.js); `params` y `searchParams` de las páginas son **Promises** que hay que `await`.
- Tailwind CSS 4. Sistema de diseño con tokens documentado (`src/app/globals.css`, bloque `@theme`, namespace `gothic-*`) — fantasía oscura, gótico tardío, alto contraste, sin texturas. Tres fuentes cargadas una sola vez en el layout raíz (EB Garamond / Hanken Grotesk / JetBrains Mono). Fuente de verdad visual: `docs/etapa-1/sistema-visual-etapa-1.md`.
- `@radix-ui/react-dropdown-menu` (S2-2, menú de usuario) es la única dependencia de UI de terceros.
- Estado de combate en cliente con **Zustand** (`src/stores/combatStore.ts`): se hidrata una vez desde el servidor al cargar la pantalla del panel DM (`CombatStoreInitializer`), y luego las mutaciones se aplican de forma **optimista** en el store antes de confirmarse contra la base (con snapshot + rollback automático si falla; ver `src/hooks/useCombatMutation.ts`). La vista de jugador (`/spectate`) no usa el store — es server-rendered y se refresca con `router.refresh()`.

**Backend**
- No hay un backend/API separado. Conviven **dos** capas de servidor:
  1. **Route Handlers** (`src/app/api/**`) para auth, campañas y perfil: `POST/GET /api/campaigns`, `POST /api/campaigns/join`, `GET/POST /api/campaigns/[id]/join/character`, `GET/PATCH /api/campaigns/[id]`, `GET/PATCH /api/profile`, `GET /api/auth/verify-email`, `[...nextauth]`. Validan sesión, membership, rol y verificación de email inline.
  2. **Server Actions** (`"use server"`, bajo `src/lib/actions/`) para combate, participantes, templates, grupos, campañas (edición), perfil y notas de personaje. **Desde S2-0 todas validan autorización** vía `src/lib/auth/action-guards.ts` (ver §7, encabezado — era el hallazgo 7.1 de la versión anterior).
- Algunas páginas server-side (`/campaigns`, `/campaigns/[id]`, `/join/character`, `/profile`) se llaman a sí mismas por HTTP contra sus propios Route Handlers, reenviando la cookie de sesión (`getBaseUrl()` + `fetch`), en vez de tocar Prisma directo (ver 7.5).

**Persistencia de datos**
- PostgreSQL en **Supabase**, Prisma ORM **5.22** (`prisma/schema.prisma`).
- **15 migraciones** aplicadas. Las 6 de Sprint 1 tienen fecha `20260824` (`add_user_table_with_email_verified`, `add_campaign`, `add_campaign_member`, `add_campaign_id_to_combat`, `add_campaign_and_owner_to_character_template`, `add_campaign_id_to_group_and_group_member`). Sprint 2 sumó una sola: **`20260831231612_add_character_notes`** (`CharacterTemplate.notes TEXT NULL`, ticket S2-6). S2-8 y S2-9 no necesitaron migración.
- La migración `add_campaign_id_to_combat` agrega `campaignId TEXT NOT NULL` sin default — rompe si la tabla `Combat` tiene filas previas (la bitácora ya advirtió esto; se asume que los datos de dev se limpiaron antes de aplicar).

**Sincronización en tiempo real entre dispositivos**
- **No implementada.** No hay websockets, SSE ni polling en ningún punto.
- Cada pantalla se actualiza solo cuando *ella misma* dispara una acción. El DM ve lo que él hace (vía store optimista); el jugador ve lo que él hace en `/spectate` (vía `router.refresh()`). Si el DM aplica daño, el jugador no lo ve sin recargar, y viceversa. `AddParticipantMidCombat` (S2-9) hace `window.location.reload()` completo tras agregar alguien, porque el store solo se hidrata una vez por `combatId`.

**Autenticación / sesión** — implementada.
- **NextAuth v5 (beta 32)**, estrategia **JWT**, config en `src/auth.ts`. Providers: **Google**, **Discord** y **Credentials** (email + contraseña con `bcryptjs`).
- OAuth: el `User` se crea (`upsert`) en el primer login, con `emailVerified` seteado de inmediato (el provider ya verificó el mail). A las cuentas OAuth se les guarda un `passwordHash` aleatorio para cumplir el `NOT NULL`.
- Email/contraseña: registro en `src/lib/actions/auth.ts`, dispara email de verificación vía **Resend**. Token de verificación **stateless**, HMAC-SHA256 firmado con `AUTH_SECRET`, TTL 24 h, sin tabla `VerificationToken` (`src/lib/auth/tokens.ts`). "Reenviar verificación" con rate-limit **en memoria** (`Map` de módulo, 60 s, se pierde al reiniciar — `src/lib/auth/rate-limit.ts`).
- **`src/proxy.ts`**: la raíz `/` redirige a `/campaigns` (con sesión) o `/login` (sin sesión); los prefijos `/campaigns`, `/join` y **`/profile`** (agregado en S2-7) exigen sesión. **`/login`, `/register` y `/combat/*` NO están en el matcher del proxy** — pero desde Sprint 2 cada uno compensa por su cuenta (ver 7.5): `/login` y `/register` chequean sesión en el `page.tsx` (S2-10), las tres pantallas de `/combat/*` hacen su propio `auth()` + membership + rol (S2-0 completó `/setup`).
- El JWT solo se refresca en sign-in — cualquier dato de usuario que viva ahí (`name`, y por omisión `emailVerified` ni siquiera se guarda) se hace stale (ver 7.7).
- Variables de entorno requeridas (no documentadas en ningún `.env.example` — no existe, solo `.env`): `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, más las credenciales OAuth que NextAuth v5 espera por convención (`AUTH_GOOGLE_ID/SECRET`, `AUTH_DISCORD_ID/SECRET`).

**Tooling agregado en Sprint 2 (fuera del backlog, no afecta runtime)**
- **Playwright e2e** (`@playwright/test` devDep, `e2e/`, `playwright.config.ts`): `global-setup.ts` siembra idempotentemente un usuario DM + campaña de prueba en la DB de `.env` (no hay modo mock, los tests ejercitan Server Actions reales). Specs: `header.spec.ts` (S2-1/S2-2), `invite-code.spec.ts` (S2-4), `edit-campaign.spec.ts` (S2-3). Cómo correr: `npx playwright test` (o `npm run test:e2e`), documentado en `CONTRIBUTING.md`.
- **Impeccable** (`.claude/skills/impeccable/` + hook en `.claude/settings.local.json`, más `.impeccable/config.json` con excepciones persistidas): auditor de "AI slop" en la UI. Skill de agente, no dependencia de la app.

---

## 2. Modelo de datos

### Entidades y relación

```
User ──< CampaignMember >── Campaign
 │                              │
 └──< CharacterTemplate         ├──< Combat ──< CombatParticipant >── CharacterTemplate
        (ownerId, nullable)     │                     │
                                │                     └──< CombatLog
                                ├──< CharacterTemplate (campaignId)
                                └──< Group ──< GroupMember >── CharacterTemplate
```

- **`User`** — centro del modelo. `email` (único), `passwordHash`, `name`, **`emailVerified: DateTime?`**, `createdAt`. Relaciona a `ownedCampaigns`, `campaignMembers`, `characterTemplates`.
- **`Campaign`** — `name`, `description?`, **`inviteCode`** (único, 6 caracteres, alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — sin 0/O/1/I; generado server-side con reintento por colisión, `src/lib/utils/campaign.ts`), `ownerId → User` (`onDelete: Restrict`), `createdAt`.
- **`CampaignMember`** — `userId`, `campaignId`, `role` (`DM` | `PLAYER`), `joinedAt`. **Único por `(userId, campaignId)`.** Un mismo usuario puede ser DM en una campaña y PLAYER en otra. `onDelete: Cascade` desde ambos lados.
- **`CharacterTemplate`** — `campaignId` (requerido, `onDelete: Cascade`), `ownerId → User?` (nullable — null = NPC/monstruo sin dueño, `onDelete: SetNull`). **No es portable entre campañas.** Un template con `ownerId` seteado = "el personaje de ese jugador en esa campaña". Campo nuevo en Sprint 2: **`notes: String?`** (S2-6) — texto libre que edita el jugador dueño desde `/campaigns/[id]/character`; el tope de longitud (`MAX_NOTES_LENGTH = 2000`, `src/lib/constants/character.ts`) se valida en la Server Action, no en la DB.
- **`Combat`** — `campaignId` (requerido). La restricción "un solo combate `SETUP`/`ACTIVE`" es **por campaña** (a nivel aplicación en `createCombatRecord`, `src/lib/actions/combat.ts`). Campos vestigiales: `joinCode` (único, nullable) e `isPublic` (bool) — ver 7.2. El schema conserva comentarios de andamiaje sin limpiar (`joinCode String? @unique // ← add this`, `// … (lib/actions/combat.ts, not yet updated in this pass)`).
- **`CombatParticipant`** — sin cambios de modelo. Donde vive **todo** el estado mutable del combate (HP, iniciativa, condiciones JSON, economía de acciones, tiradas de muerte). Copia del template al crearse: `level`, `proficiencyBonus`, `str/dex/con/int/wis/cha`, `speed` (default 30), `hitDice` (nullable) — todos sin uso mecánico. No copia `exhaustionLevel` ni `notes` (no existen en este modelo).
- **`CombatLog`** — sin cambios. Append-only, un evento por round, `type ∈ {DAMAGE, HEAL, CONDITION_ADDED, CONDITION_REMOVED, NOTE}`.
- **`Group` / `GroupMember`** — con `campaignId` (requerido) en ambos. Preset de encuentros del DM (NPCs/monstruos con cantidad), no representa "quién juega realmente".

### Campos de `CharacterTemplate` relevantes

`type` (PLAYER/NPC/MONSTER, **inmutable tras crear** — es lo único inmutable), `maxHp`, `currentHp` (nullable = arranca full), `baseAc`, `initiativeBonus`, `level` (default 1), `proficiencyBonus` (default 2), `str/dex/con/int/wis/cha` (default 10), `exhaustionLevel` (0–6, default 0), `notes` (nullable), `createdAt`.

**Desde S2-8, el DM puede editar `level`, `proficiencyBonus`, las 6 características y `exhaustionLevel`** desde `/campaigns/[id]/templates/[templateId]/edit` — `createTemplate`/`updateTemplate` ahora leen y persisten esos campos (antes los descartaban en silencio, era el hallazgo 7.2). Un jugador **no** puede: los stats numéricos siguen siendo DM-only. Ninguno de estos valores tiene efecto mecánico todavía (§4).

### Roles de usuario (DM vs jugador)

Modelado vía `CampaignMember.role`.
- **DM**: `role = DM` en esa campaña (lo es automáticamente quien la crea). Ve el hub completo, accesos a Personajes/Grupos, botón "Nuevo combate", el panel de control `/combat/[id]`, el link "Editar" campaña (S2-3), el chip de código de invitación (S2-4).
- **Jugador**: `role = PLAYER` (se crea al elegir/crear personaje en `/join/character`). Ve el hub en modo jugador (solo su personaje), `/campaigns/[id]/character` (ficha completa, S2-6) y `/combat/[id]/spectate` durante un combate.
- La identidad "mi personaje" se resuelve como *el `CharacterTemplate` de esta campaña con `ownerId = mi userId`* — no hay cookie (`player_participant_id`/`player_combat_id` fueron eliminadas en D12).

---

## 3. Pantallas/rutas ya implementadas

### Navegación global (S2-1 / S2-2 — nuevo)

- **`AppHeader`** (`src/components/nav/AppHeader.tsx`, Server) — header persistente montado en **`campaigns/layout.tsx`** y **`combat/layout.tsx`** (nuevo). Wordmark **GRIMOIRE** (placeholder, decisión 9) con link a `/campaigns`, y el menú de usuario si hay sesión. **No es una barra de tabs** (decisión 10 vigente) — solo wayfinding. No va sobre `/login`, `/register` ni `/join`. No agrega guard propio.
- **`UserMenu`** (`"use client"`, Radix dropdown) — trigger es un botón-ícono con la inicial del nombre/email. Contenido: nombre + email (no interactivo), "Mi perfil" → `/profile`, "Cerrar sesión" → `signOut({ redirectTo: "/login" })` de `next-auth/react` (funciona sin `<SessionProvider>`).
- **Back-links contextuales** (`← Volver a la campaña`, etc.) siguen existiendo en cada pantalla — el header es adicional, no los reemplaza.

### Auth (fuera de campaña)

| Ruta | Qué hace | Estado / notas |
|---|---|---|
| `/` | No tiene `page.tsx`. `src/proxy.ts` la intercepta siempre y redirige a `/campaigns` o `/login`. | Si el proxy no corre, `/` es 404 (ver 7.4). |
| `/login` | OAuth (Google/Discord) arriba + form email/contraseña. `<details>` para reenviar verificación. Traduce estados de query param (`registered`, `verify`, `resent`, `error`) a banners. | Funcional. **Si ya hay sesión, `redirect("/campaigns")`** (S2-10 — antes no lo hacía, era 7.13). |
| `/register` | Nombre + email + contraseña (mín. 8) + mismos OAuth. Dispara email de verificación. | Funcional. Igual que `/login`: redirige con sesión activa (S2-10). |
| `/api/auth/verify-email` | GET con `?token=` → valida HMAC, setea `emailVerified`, redirige a `/login?verify=…`. | Funcional. Token idempotente al replay. |

### Campañas

| Ruta | Rol | Qué hace | Estado / notas |
|---|---|---|---|
| `/campaigns` | sesión | Lista de campañas del usuario con badge de rol e indicador de "combate activo". Botones "Crear campaña" / "Unirme". | Funcional. Se sirve con `fetch` a `GET /api/campaigns` (7.5). |
| `/campaigns/new` | sesión | Form nombre + descripción. Al crear, la misma pantalla cambia a la confirmación con el `inviteCode` (`InviteCodeChip size="lg"`). | Funcional. Desde S2-4 el código **también** se recupera desde el hub, así que cerrarlo acá ya no lo pierde. |
| `/campaigns/[id]` | DM o Jugador | **Hub de campaña, una sola ruta, layout por `role`.** Bloque de estado (DM: PV promedio + nº jugadores; Jugador: nombre/PV/CA/nivel + link "Ver ficha completa →" a `/character`). Chip de código de invitación (DM, S2-4). Link "Editar" (DM, S2-3). Card de combate activo — "Turno de" se resuelve con `computeCurrentActor` (S2-12). Accesos DM a Personajes/Grupos + "Nuevo combate". Lista de combates finalizados. | Funcional. `fetch` a `GET /api/campaigns/[id]`, que hace el check de membership (403 → `notFound()`). No hay `layout.tsx` propio — el guard vive en el Route Handler. |
| `/campaigns/[id]/edit` | **DM** | **Nuevo (S2-3).** Form nombre + descripción, mismo look que `/campaigns/new`. Precarga por Prisma directo; guarda vía Server Action `updateCampaign` (Prisma directo + `requireCampaignDmAction`), redirige al hub. | Funcional. Ver 7.6 sobre el `PATCH` REST sin consumidor. |
| `/join` | sesión | Input de 6 caracteres. Bloqueado con banner + submit deshabilitado si `emailVerified` es null (se lee de la DB en vivo). Link mágico `/join?code=XXXXXX` auto-submitea si ya está verificado. | Funcional. |
| `/join/character` | Jugador (sin confirmar) | Lista de `CharacterTemplate` tipo PLAYER **sin dueño** + "Crear mi personaje" siempre visible. Al elegir/crear se hace el `CampaignMember` `role = PLAYER` de forma atómica (`updateMany … where ownerId: null`). | Funcional. El form de creación solo pide nombre + PV máx. + CA — el resto de los stats los completa el DM después desde el edit de personaje (flujo coherente post-S2-8). |

### Perfil de usuario (S2-7 — nuevo)

| Ruta | Rol | Qué hace | Estado / notas |
|---|---|---|---|
| `/profile` | sesión | Nombre (editable, `EditNameForm` + Server Action `updateProfile` que hace `PATCH /api/profile`), email (solo lectura), lista compacta de campañas con badge de rol (reusa `GET /api/campaigns`). `layout.tsx` propio con `<AppHeader/>`. | Funcional. Email y contraseña **explícitamente fuera de alcance** (interactúan con `emailVerified`). Limitación conocida: el nombre del header queda stale hasta el próximo login (7.7). |

### Personajes y grupos (anidados bajo campaña — D16)

| Ruta | Rol | Qué hace | Estado / notas |
|---|---|---|---|
| `/campaigns/[id]/templates` | **DM** | Lista de `CharacterTemplate` de la campaña (filtro por tipo/nombre), form de creación (`CreateTemplateForm` — todos los campos, incluidos stats), panel de descanso (`RestPanel`). | Funcional. Guard `requireCampaignDm` en `layout.tsx` **y** repetido en `page.tsx` (hallazgo D16). |
| `/campaigns/[id]/templates/[templateId]/edit` | **DM** | Edita nombre, PV máx., CA, bono de iniciativa, **nivel, bono de competencia, 6 características y agotamiento** — todos persisten desde S2-8 (antes los 4 últimos grupos se descartaban, era 7.2). `type` bloqueado. Valida que `templateId` pertenezca a `campaignId`. | Funcional. |
| `/campaigns/[id]/character` | **Jugador dueño** | **Nuevo (S2-6).** Ficha **de solo lectura** de los stats reales (PV/CA/iniciativa/competencia, 6 características con su modificador, agotamiento). Único campo editable: `notes` (`CharacterNotesForm` → Server Action `updateCharacterNotes` con guard `requireTemplateOwner` — ser DM **no alcanza**, las notas son personales). Guard de membership inline en el `page.tsx`. Un DM (que no posee templates de jugador) cae en el empty state "No tenés un personaje asignado". | Funcional. La variante "DM ve la ficha de cualquier jugador" quedó **sin construir** (el ticket la dejó a definir). |
| `/campaigns/[id]/groups` | **DM** | Lista de grupos guardados + filtro + "Nuevo grupo". | Funcional. |
| `/campaigns/[id]/groups/new` | **DM** | Alta de grupo (nombre + descripción). Client component; `campaignId` de `useParams()`. | Funcional. |
| `/campaigns/[id]/groups/[groupId]` | **DM** | Detalle: agregar/quitar templates de la campaña con cantidad. Botón "Iniciar combate con este grupo". | Funcional. El bug histórico "Start combat with this group" está arreglado (E5): `<Link>` a `/campaigns/[id]/groups/[groupId]/start-combat` (Route Handler GET) que crea el combate scopeado, copia participantes con stats reales y redirige a `/combat/[id]/setup`. |

### Combate (rutas planas `/combat/*`, NO bajo `/campaigns/[id]`)

| Ruta | Rol | Qué hace | Estado / notas |
|---|---|---|---|
| `/campaigns/[id]/combat/new` | **DM** (Route Handler GET) | Crea el `Combat` scopeado (`createCombat`, rechaza un segundo combate simultáneo por campaña) y redirige a `/combat/[id]/setup`. | Funcional. **No pasa `name`** → todos los combates creados desde el hub se llaman "New Combat" (7.8). |
| `/combat` | — | Redirige siempre a `/campaigns`. | Funcional (redirect). Sin fuga: un no autenticado rebota de `/campaigns` a `/login` por el proxy. |
| `/combat/[id]/setup` | **DM** | El DM agrega participantes (uno por uno o cargando un grupo), tipea la tirada de d20 de cada uno e inicia el combate. | Funcional. **Desde S2-0 verifica sesión + membership + rol** (no-miembro → 404 enmascarado, jugador → redirige a `/spectate`) — era el hallazgo 7.10, la única de las tres pantallas de combate sin el bloque `auth()`. |
| `/combat/[id]` | **DM** | Panel principal: orden de iniciativa, daño/curación, HP temporal, condiciones, modificadores de AC, toggles de acción/bonus/reacción, tiradas de muerte, reordenar turnos (drag & drop), avanzar turno, **agregar participante a mitad de combate con su iniciativa (S2-9)**, **editar/corregir la iniciativa de cualquier participante durante el combate ACTIVE (S2-9)**, terminar combate (con o sin volcar HP a templates). Link "Vista previa de jugador" a `/spectate`. | Funcional, la pantalla con más lógica. `auth()` + membership: no-miembro → `notFound()`, PLAYER → redirige a `/spectate`. No muestra ningún código de invitación. |
| `/combat/[id]/spectate` | **Jugador** (o DM en preview) | Orden de iniciativa (HP exacto solo del propio personaje; para los demás, etiqueta cualitativa "Herido/Malherido/Crítico"). El jugador expande **solo su personaje** para aplicar daño/curación/condiciones y registrar tiradas de muerte. Bitácora. | Funcional. `auth()` + membership: no-miembro → `notFound()`. Sin paso de aprobación del DM. **"Turno actual" alineado con el panel DM** (`computeCurrentActor`, S2-12) — era el hallazgo 7.11. |

### Componentes huérfanos

- `src/components/HelloWorld.tsx` — sigue existiendo, sin importar en ninguna ruta.

---

## 4. Automatización de reglas ya resuelta

Sin cambios en Sprint 2 — no se tocó lógica de reglas de D&D.

### Automático (calculado por código — `src/domain/combat/`)
- AC total = `baseAc` + suma de `acModifiers`.
- Barra/dial de HP y color condicional (`> 25%` brass, `≤ 25%` danger + pulso; inconsciente = gris).
- Daño: descuenta primero de `tempHp`, después de `currentHp`, nunca baja de 0, marca inconsciencia si llega a 0.
- Curación: sube hasta `maxHp`; si "recupera la consciencia", resetea tiradas de muerte y `isStabilized`.
- Tiradas de muerte: 3 aciertos → estabilizado; 3 fallos → sale de la rotación de turnos (sigue en la lista, se lo saltea).
- Orden de turnos: `computeCurrentActor` / `computeAdvanceTurn` ordenan por `turnOrder`, saltean a quien tenga `deathSaveFailures >= 3`, resetean acción/bonus/reacción de quien entra al turno, incrementan `round` al dar la vuelta. Un inconsciente-pero-no-muerto **sigue** en la rotación (ese turno es la señal para tirar la salvación). Estas funciones son la fuente única del "turno actual" — panel DM, store, `/spectate` y hub las usan todas (S2-12).
- **`computeTurnOrder`** (`domain/combat/rules.ts`): fuente única de "lista de iniciativas → orden de turnos" (iniciativa desc, desempate por `initiativeBonus`, luego sort estable). La usan `startCombat` (tirada inicial de d20) y `setParticipantInitiative` (edición tardía, S2-9), así producen órdenes idénticos.
- Iniciativa al iniciar combate: tirada manual (d20) + `initiativeBonus` del template (sumado server-side).
- Etiqueta cualitativa de HP para la vista de jugador (`qualitativeHpLabel`).

### Manual (una persona lo resuelve y lo tipea)
- **No hay generación de números aleatorios en ningún lado** — ni siquiera para `inviteCode`/`joinCode`, que usan `Math.random`. Iniciativa, ataques, salvaciones y tiradas de muerte se resuelven fuera de la app.
- No hay tirada de ataque vs AC ni impacto/fallo — el daño se tipea ya resuelto.
- No hay cálculo de salvaciones ni de DC. `str/dex/con/int/wis/cha`, `level`, `proficiencyBonus` existen como datos (ahora editables por el DM, S2-8) pero **ninguna función los lee**.
- Condiciones = etiquetas de texto libre sin efecto mecánico (14 comunes hardcodeadas en `src/lib/constants/conditions.ts`, pero el campo acepta cualquier texto).
- `exhaustionLevel` (0–6) se guarda y ya se puede editar, pero no dispara ningún efecto.

### Fuente de reglas/contenido
- Sin integración con ninguna API de reglas (SRD, 5etools, etc.). Todo el contenido lo tipea el DM al crear templates.

---

## 5. Decisiones ya tomadas que restringen el diseño

Además de las de `docs/etapa-1/spec-tecnico-etapa-1.md` §4 (todas vigentes), lo que el código impone hoy:

- **Todo vive dentro de una campaña.** Combate, personajes y grupos no son secciones globales — se llega a ellos desde el hub. El header global (S2-1) es solo wayfinding (wordmark + menú de usuario), **no** una barra de secciones (decisión 10 sigue vigente). Con el header más los back-links contextuales, ya no hace falta el botón del navegador para moverse.
- **Un solo combate `SETUP`/`ACTIVE` por campaña.** `createCombatRecord` lo rechaza.
- **El personaje pertenece a la campaña, no es portable.** No hay `getTemplates()` sin scope (se eliminó en D16).
- **`type` de personaje es lo único inmutable.** Nivel, competencia, características y agotamiento **sí** se editan (S2-8), pero solo el DM, solo desde `/campaigns/[id]/templates/[templateId]/edit`. Un jugador solo edita sus `notes`.
- **La identidad es cuenta + email verificado.** Bloqueo real en `/join` si `emailVerified` es null. El link de invitación es atajo de UX, no seguridad.
- **Toda mutación valida autorización en su propio punto de entrada** (S2-0) — no se hereda de la pantalla que la invoca. El guard va en la Server Action / Route Handler, además de en el `page.tsx` que la renderiza.
- **El hub de campaña es una sola ruta con layout por rol** — no dos páginas.
- **Los jugadores editan su propio HP/condiciones sin mediación del DM** desde `/spectate` — se escribe directo a la base, sin aprobación.
- **El HP final solo se vuelca al template si el DM elige "Terminar combate + guardar PV"** — si no, el próximo combate arranca del HP guardado (o full si es null).
- **No hay sincronización en vivo.** Ningún flujo puede asumir "todos ven lo mismo en tiempo real".
- **No hay modo offline ni cola de reintentos** — las mutaciones pegan a la base de inmediato; si fallan, se revierte lo optimista y se muestra un toast.
- **El combate vive en rutas planas `/combat/*`**, fuera del árbol `/campaigns/[id]/` — el scoping a campaña se resuelve leyendo `Combat.campaignId` contra la membership, no por la estructura de URL.
- **La app es en español** (decisión 12). La bitácora de combate ya es 100% español (S2-11 tradujo los `CombatLog.note` server-side). Excepción residual: los mensajes de error de varias Server Actions siguen en inglés (7.3).
- **Edición de perfil: solo nombre.** Email y contraseña quedan fuera por su interacción con `emailVerified`.

---

## 6. Pendientes conocidos

- **Recuperación de contraseña** (B4 / ticket **S2-5**): **no implementada** — es el único ticket de Sprint 2 que quedó abierto. No hay pantalla de "olvidé mi contraseña", ni campos de token de reset en `User`, ni flujo de Resend para esto. Incluye migración de schema.
- **Sincronización en tiempo real**: no implementada (Sprint 5 en `roadmap-futuro.md`).
- **Automatización de tiradas** (iniciativa, ataque, salvación): no implementada (Sprint 3).
- **Efectos mecánicos de condiciones y agotamiento**: no implementados — son etiquetas/números inertes.
- **Aprobación del DM sobre cambios del jugador en combate**: no implementada.
- **Modo offline / cola de reintentos**: no implementado.
- **DM ve la ficha de cualquier jugador de su campaña**: S2-6 lo dejó a definir y **no se construyó** — `/campaigns/[id]/character` solo resuelve el personaje del propio viewer.
- **Nombrar un combate**: no hay UI — todos los creados desde el hub se llaman "New Combat" (7.8).
- **Finalizar / cerrar / borrar una campaña**: descartado a propósito, falta decisión de producto.
- **Concurrencia en `/join/character`**: el claim de un template existente es atómico, pero dos personas creando el mismo personaje nuevo en simultáneo no está contemplado.
- **E4** (verificar en navegador real que ningún `position: fixed` tape contenido interactivo): sin verificar en vivo.
- **Cobertura Playwright de S2-6** (ficha de personaje): el seed de e2e solo crea un usuario DM sin templates propios, así que el caso feliz de S2-6 no es alcanzable sin extender los fixtures — no está testeado.

---

## 7. Deuda técnica e inconsistencias detectadas (no documentadas en la bitácora §8)

> Lo de esta sección salió de leer el código actual y **no** está en `spec-tecnico-etapa-1.md` §8.
>
> **Resueltos en Sprint 2** (la regeneración anterior de este documento los listaba como abiertos; ver §8 de `spec-tecnico-etapa-1.md` para el detalle de cada cierre):
> - **7.1 anterior** — Server Actions de combate/personajes/grupos sin control de autorización → **S2-0** (`src/lib/auth/action-guards.ts`, guard en cada mutación).
> - **7.2 anterior** — formularios de personaje con campos que nunca se guardaban → **S2-8**.
> - **7.10 anterior** — `/combat/[id]/setup` sin control de acceso → **S2-0**.
> - **7.11 anterior** — `addParticipant` a mitad de combate dejaba el participante en `initiative: 0` / `turnOrder: 0` sin forma de corregirlo → **S2-9**.
> - **7.13 anterior** — `/login` y `/register` no redirigían con sesión activa → **S2-10**.
> - **7.15 anterior** — bitácora de combate bilingüe (`CombatLog.note` en inglés) → **S2-11**.
> - **7.16 anterior** — `/spectate` y el panel DM calculaban "turno actual" con criterios distintos → **S2-12**.

### 7.1 `Combat.joinCode` / `Combat.isPublic` son código muerto

- `startCombat` sigue generando un `joinCode` de 6 caracteres (`generateJoinCode()`) en cada inicio de combate y lo persiste.
- **Nada consume ese código.** El flujo `/join` usa `Campaign.inviteCode`. El panel DM no muestra ningún código. `isPublic` nunca se lee ni se escribe.
- El schema conserva comentarios de andamiaje sin limpiar (`joinCode String? @unique // ← add this`, y otro que dice `not yet updated in this pass`).

### 7.2 Exports muertos en `src/lib/actions/combat.ts` y `queries/combat.ts`

`getActiveCombat` (envuelve `getActiveCombatDetail`, un `findFirst` **sin `campaignId`**, con el comentario pre-campañas *"We enforce one combat at a time at the query level"*), `getCombatById` y `getCombatByJoinCode` no tienen consumidores. `getActiveCombatDetail` y `getCombatByJoinCodeDetail` solo los usan esos wrappers muertos.

### 7.3 Los mensajes de error de varias Server Actions están en inglés — **⚠️ Contradice decisión 12 (idioma español)**

S2-11 tradujo los `CombatLog.note` que arma `participant.ts`, pero fue explícitamente lo único en alcance. Siguen en inglés:
- `templates.ts` (`"Name is required"`, `"HP must be at least 1"`, `"Invalid character type"`, y los de S2-8: `"Level must be a whole number of at least 1"`, `"STR must be a whole number between 1 and 30"`, etc.).
- `groups.ts` (`"Name is required"`, `"Quantity must be between 1 and 20"`, `"Template belongs to a different campaign"`, …).
- Los `throw new Error(...)` de `combat.ts` (`"Combat not found"`, `"Add at least one participant before starting"`, …) y el mensaje de `createCombatRecord` (`"A combat is already in progress in this campaign…"`).

`participant.ts`, `campaigns.ts`, `profile.ts` y `character.ts` sí devuelven español. La mezcla es visible para el usuario en `CreateTemplateForm`, el edit de personaje y el form de grupos.

### 7.4 No hay `src/app/page.tsx`

La ruta `/` no tiene componente — depende 100% de que `proxy.ts` la intercepte. Sin el proxy (mala config, build sin middleware) `/` es un 404.

### 7.5 Varias páginas server-side se llaman a sí mismas por HTTP

`/campaigns`, `/campaigns/[id]`, `/join/character` y ahora `/profile` (S2-7) hacen `fetch(getBaseUrl() + "/api/…")` con la cookie reenviada, en vez de Prisma directo. Duplica el round-trip y depende de que `x-forwarded-host` / `host` estén bien en el deploy. Es deliberado (C4/C5 como "fuente única"), pero es sobrecarga y un punto de fragilidad. La bitácora de S2-3 registra que **este mismo patrón deadlockeó el dev server bajo la corrida e2e** (un `fetch` de Server Action a una route del mismo origen compite por los request workers), por eso `updateCampaign` y el precargado de `/campaigns/[id]/edit` van por Prisma directo — o sea el patrón ya se abandonó parcialmente.

### 7.6 `PATCH /api/campaigns/[id]` existe pero ningún cliente lo usa

S2-3 agregó el endpoint REST (con guard de rol DM → `403 NOT_DM`), pero la UI de edición de campaña va por la Server Action `updateCampaign` (Prisma directo, por el deadlock de 7.5). Queda como superficie sin consumidor. Contrasta con `PATCH /api/profile` (S2-7), que **sí** es el único camino de escritura del nombre (lo llama `updateProfile`). Dos features gemelas, dos arquitecturas distintas.

### 7.7 El JWT de NextAuth no se refresca fuera del sign-in

El token solo se arma en sign-in y nunca se re-lee de la DB. Consecuencias:
- **`emailVerified` no vive en el token** — todas las comprobaciones de verificación (`/join`, C2/C3) leen la DB en vivo, así que hoy no hay bug activo, pero cualquier feature nueva que confíe en `session` para saber si el email está verificado va a estar ciega.
- **`session.user.name` sí queda cacheado del sign-in** — tras editar el perfil (S2-7), el nombre en `AppHeader` (que lo lee de `auth()`) queda desactualizado hasta el próximo login. `/profile` muestra el nombre fresco porque lo lee de la DB. La bitácora de S2-7 lo reconoce como limitación conocida.

### 7.8 Todos los combates creados desde el hub se llaman "New Combat"

`createCombatRecord` usa `name?.trim() || "New Combat"`. El Route Handler `/campaigns/[id]/combat/new` arma el `FormData` solo con `campaignId`. `startCombatFromGroup` tampoco pasa nombre. `/combat/[id]/setup` y el hub muestran ese `combat.name`. No hay forma de nombrar un combate. (String en inglés, además — 7.3.)

### 7.9 `README.md` sigue siendo el de `create-next-app`

Menciona `app/page.tsx`, la fuente Geist, "editing the page". No dice nada de Prisma, Supabase, variables de entorno ni el setup de auth. No hay `.env.example`. Sprint 2 agregó `CONTRIBUTING.md` (que sí documenta cómo correr los e2e), pero el README quedó sin tocar.

### 7.10 Dependencia `cookies-next` sin uso

Quedó de la cookie `player_participant_id` / `player_combat_id` que D12 eliminó. Ya no se importa en ningún archivo de `src/`.

### 7.11 `addParticipantsFromGroup` todavía crea participantes en `turnOrder: 0`

S2-9 arregló `addParticipant` (ahora crea en `turnOrder = fin de lista`, no 0). `addParticipantsFromGroup` **no** se tocó — sigue con `initiative: 0, turnOrder: 0` para cada miembro. Hoy no rompe nada porque solo se llama desde `/setup` y `startCombatFromGroup` (ambos pre-combate, y `startCombat` recomputa todo el orden). Pero la función solo rechaza `status === "FINISHED"`, así que estructuralmente aceptaría un combate `ACTIVE` — no hay UI que lo dispare, es una inconsistencia latente entre las dos funciones de "agregar participantes".

### 7.12 `src/proxy.ts` no cubre `/combat/*` ni `/login` / `/register`

El matcher es `["/", "/campaigns", "/campaigns/:path*", "/join", "/join/:path*", "/profile", "/profile/:path*"]`. Desde Sprint 2 **cada ruta fuera del matcher compensa por su cuenta**: `/login` y `/register` chequean sesión en el `page.tsx` (S2-10); las tres pantallas de `/combat/*` hacen su propio `auth()` + membership + rol (S2-0 completó `/setup`). El resultado es correcto hoy, pero el enforcement quedó repartido entre el proxy y ~5 `page.tsx` — sumar una ruta `/combat/*` nueva sin recordar el bloque de guard la deja abierta, y el proxy no avisa.

### 7.13 Inconsistencia en el contrato de las Server Actions

Conviven dos estilos: `advanceTurn` / `dealDamage` / `setParticipantInitiative` (S2-9) / etc. devuelven `{ ok, error }` y nunca tiran; `endCombat` / `startCombat` / `createCombat` / `addParticipant` hacen `redirect()` o `throw new Error`. El `catch` de `useCombatMutation` asume el primer estilo. `templates.ts` y `groups.ts` usan un tercer shape (`{ error?, success? }`). No es un bug hoy (cada acción se usa desde el contexto correcto), pero es una trampa para quien reutilice una acción en un contexto nuevo.
