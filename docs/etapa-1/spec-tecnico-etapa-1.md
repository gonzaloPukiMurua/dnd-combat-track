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

## 7. Explícitamente fuera de alcance de esta etapa

- Sincronización en tiempo real entre dispositivos.
- Automatización de tiradas (iniciativa, ataque, salvación) — todo se tipea a mano. El bloque de "Acciones" con fórmulas de daño que aparece en la ficha de personaje generada es **referencia visual estática**, sin lógica de tirada conectada — Stitch se adelantó a esto por su cuenta, no construir interactividad sobre ese bloque en esta etapa.
- Efectos mecánicos de condiciones y agotamiento.
- Aprobación del DM sobre cambios que hace un jugador a su propio personaje en combate.
- Modo offline / cola de reintentos.

---

## 8. Bitácora de ejecución — Épica A

Las 6 migraciones de la Épica A están aplicadas y la DB está en sync:

1. `add_user_table_with_email_verified` (A1)
2. `add_campaign` (A2)
3. `add_campaign_member` (A3)
4. `add_campaign_id_to_combat` (A4)
5. `add_campaign_and_owner_to_character_template` (A5)
6. `add_campaign_id_to_group_and_group_member` (A6)

El modelo `User` estaba en el schema desde antes pero nunca se había migrado — la tabla no existía en la DB. La migración de A1 la creó junto con `emailVerified`.

Se encontraron datos de desarrollo huérfanos sin `campaignId` antes de aplicar A4/A5/A6: 13 `Combat`, 30 `CharacterTemplate`, 3 `Group` (17 `GroupMember`). Se borraron — fue una decisión explícita, no una migración de esos datos a una campaña placeholder.

`generateUniqueInviteCode()` (reintento ante colisión, no confía solo en el `@unique` de la DB) quedó implementado en `src/lib/utils/campaign.ts`.

**Gap abierto para Épica C:** el schema y el índice (`@@index([campaignId, status])`) ya soportan la restricción de "un solo combate activo por campaña", pero la lógica en `combat.ts` todavía la aplica de forma **GLOBAL**, no por campaña. A4 cerró el modelo de datos, no el comportamiento.

`src/lib/actions/combat.ts`, `groups.ts` y `templates.ts` quedaron sin tipar (`tsc --noEmit` falla) porque sus `prisma.*.create()` no pasan `campaignId` todavía. Es esperado hasta que Épica C los conecte, no es una regresión a arreglar ahora.
