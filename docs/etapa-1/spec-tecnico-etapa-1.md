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

**Cierre de Épica E (QA y casos borde):** los 5 ítems se revisaron contra el código real, no por inspección superficial de pasadas anteriores. Detalle de cómo se verificó cada uno:

- **E1** — código: el botón "Crear mi personaje" en `CharacterPicker.tsx` está condicionado únicamente por el estado local `showCreateForm`, nunca por `characters.length`. En vivo: se sembró una campaña con un roster de 2 `CharacterTemplate` tipo `PLAYER` sin dueño y se pidió `/join/character?campaignId=...` autenticado como un usuario sin membresía — el HTML devuelto trae el roster completo **y** el botón de crear, simultáneamente. ✅
- **E2** — se forzó una colisión real: se insertó un `Campaign` con `inviteCode = "AAAAAA"` y se mockeó `Math.random` para que la primera pasada de `generateInviteCode()` produjera exactamente ese valor. Se llamó a la función real `generateUniqueInviteCode()` (import directo del módulo, sin reescribir su lógica) — detectó la colisión contra la fila sembrada, reintentó, y devolvió un código distinto (`"SSSSSS"`) sin lanzar excepción. `Math.random` se invocó 12 veces (2 pasadas de 6), confirmando que el loop de reintento corrió. ✅
- **E3** — código: ni `COMBAT_DETAIL_INCLUDE` (query) ni `CombatView`/`SpectateView` (render) filtran por `isConscious`; ambos aplican `opacity-70` condicionalmente sin excluir la fila. En vivo: se sembró un combate `ACTIVE` con un participante consciente y uno derrotado (`currentHp: 0, isConscious: false`). En `/combat/[id]/spectate` (server-rendered con props reales) se confirmó ambos presentes y `opacity-70` aplicado solo al derrotado. En `/combat/[id]` (panel DM) el mismo chequeo por curl **no** es concluyente: `CombatView` lee de un store de Zustand que se hidrata en un `useEffect` (`CombatStoreInitializer`), así que el HTML de una petición sin JS muestra el estado inicial vacío del store ("Todavía no hay participantes...") aunque los datos reales sí viajan en el payload para hidratar — se confirmó por lectura de código que la lógica de filtrado es idéntica a la de spectate, pero el comportamiento renderizado del panel DM específicamente **no se pudo confirmar en vivo sin navegador real** (mismo limitante que E4). ✅ por código + spectate en vivo; panel DM sin verificación en vivo.
- **E4** — sin verificar en vivo. La extensión de Chrome no está conectada en esta sesión (`tabs_context_mcp` devuelve "Browser extension is not connected"); se reintentó justo antes de este cierre y sigue sin disponibilidad. Queda pendiente de revisión manual en navegador real.
- **E5** — resuelto en D16 (ver más arriba): `startCombatFromGroup` crea el combate scopeado a la campaña del grupo, copia participantes vía `addParticipantsFromGroup` con stats reales, y redirige a `/combat/[id]/setup`. Verificado en vivo end-to-end en la pasada de D16.

---

## 7. Explícitamente fuera de alcance de esta etapa

- Sincronización en tiempo real entre dispositivos.
- Automatización de tiradas (iniciativa, ataque, salvación) — todo se tipea a mano. El bloque de "Acciones" con fórmulas de daño que aparece en la ficha de personaje generada es **referencia visual estática**, sin lógica de tirada conectada — Stitch se adelantó a esto por su cuenta, no construir interactividad sobre ese bloque en esta etapa.
- Efectos mecánicos de condiciones y agotamiento.
- Aprobación del DM sobre cambios que hace un jugador a su propio personaje en combate.
- Modo offline / cola de reintentos.