# Sprint 1 — Auth + Campañas: backlog técnico

> Traduce `etapa-1-decisiones-ux-tecnico.md` + el diseño validado en Stitch a tickets ejecutables. Organizado por área, con orden de ejecución sugerido al final. Cada ticket asume Next.js + Prisma + next-auth, consistente con el stack ya presente en el repo.

---

## Épica A — Modelo de datos y migraciones

**A1. Agregar `emailVerified` a `User`**
- Campo `emailVerified: DateTime?` (o boolean, según convención de next-auth).
- Criterio de aceptación: un usuario nuevo se crea con `emailVerified = null`; se setea al confirmar el link de verificación.

**A2. Crear modelo `Campaign`**
- Campos: `id`, `name`, `description?`, `inviteCode` (string, 6 caracteres alfanuméricos, único, uppercase), `ownerId → User`, `createdAt`.
- Criterio de aceptación: `inviteCode` se genera server-side al crear la campaña, con verificación de colisión (reintentar si ya existe).

**A3. Crear modelo `CampaignMember`**
- Campos: `id`, `userId → User`, `campaignId → Campaign`, `role` (enum `DM` | `PLAYER`), `joinedAt`.
- Constraint: único por `(userId, campaignId)`.
- Criterio de aceptación: un usuario puede tener múltiples filas con distinto `campaignId` y distinto `role`.

**A4. Migrar `Combat` a scope de campaña**
- Agregar `campaignId → Campaign` (requerido).
- Migrar la restricción "un solo combate en `SETUP`/`ACTIVE`" de global a **por campaña**.
- ⚠️ Requiere decidir qué pasa con combates existentes en la DB actual sin campaña — probablemente crear una "campaña de migración" o limpiar datos de desarrollo antes de aplicar.

**A5. Migrar `CharacterTemplate` a scope de campaña**
- Agregar `campaignId → Campaign` (requerido) y `ownerId → User` (nullable — null para NPCs/monstruos sin dueño).
- Criterio de aceptación: un `CharacterTemplate` con `ownerId` seteado no aparece en el roster de otra campaña aunque el mismo usuario sea miembro de varias.

**A6. Migrar `Group`/`GroupMember` a scope de campaña**
- Mismo criterio que A5: agregar `campaignId → Campaign`.

**Dependencias:** A2 y A3 deben ir antes que A4/A5/A6 (necesitan la FK a `Campaign`).

---

## Épica B — Autenticación

**B1. Configurar providers OAuth en next-auth**
- Google y Discord, según credenciales de cada consola de desarrollador.
- Criterio de aceptación: login funcional con ambos, crea `User` en primer login si no existe.

**B2. Flujo de verificación de email**
- Envío de email al registrarse con email/contraseña (no aplica a OAuth, que ya viene verificado por el provider).
- Endpoint de confirmación que setea `emailVerified`.
- Acción "Reenviar verificación" con rate limit básico (evitar spam de reenvíos).

**B3. Middleware de sesión**
- Ruta raíz detecta sesión activa: si existe, redirige a `/campaigns`; si no, a `/login`.
- Rutas protegidas (`/campaigns/*`) requieren sesión.

**B4. Recuperación de contraseña**
- No wireframeado en detalle — implementar con el flujo estándar de next-auth (magic link o reset por email). Marcar como de menor prioridad si el sprint se ajusta de tiempo.

**Dependencias:** B2 depende de A1.

---

## Épica C — Backend de campañas

**C1. Crear campaña** — `POST /api/campaigns`
- Input: `name`, `description?`. Usuario autenticado queda como `CampaignMember` con `role = DM` automáticamente.
- Devuelve el `inviteCode` generado.

**C2. Unirse a campaña por código** — `POST /api/campaigns/join`
- Input: `inviteCode`. Bloquear si `emailVerified` es null (error 403 con mensaje específico que el frontend traduce al banner).
- Si el código es válido y el usuario no es miembro todavía, queda pendiente de elegir/crear personaje antes de confirmar el `CampaignMember`.

**C3. Elegir o crear personaje al unirse** — `POST /api/campaigns/[id]/join/character`
- Opción A: `characterTemplateId` existente sin `ownerId` → se le asigna `ownerId = usuario actual`.
- Opción B: datos de personaje nuevo → crea `CharacterTemplate` con `campaignId` y `ownerId` seteados.
- Al confirmar cualquiera de las dos, crea el `CampaignMember` con `role = PLAYER`.

**C4. Listar campañas del usuario** — `GET /api/campaigns`
- Devuelve campañas donde el usuario es `CampaignMember`, con su `role` en cada una y si hay combate activo (`Combat.status IN (SETUP, ACTIVE)`).

**C5. Hub de campaña** — `GET /api/campaigns/[id]`
- Devuelve combate activo (si existe) + lista de combates anteriores, scopeados a la campaña.
- Respuesta condicionada por rol: si `role = PLAYER`, no incluir data de gestión (aunque el frontend igual debe validar permisos, no confiar solo en ocultar en UI).

**Dependencias:** toda la épica C depende de A2–A6 y B2.

---

## Épica D — Frontend, pantalla por pantalla

Cada ticket = una ruta. Reutilizar componentes ya definidos en el brief visual (dial HP, badges, ledger, cards) donde aplique.

| Ticket | Ruta | Depende de |
|---|---|---|
| D1. Login | `/login` | B1, B3 |
| D2. Registro | `/register` | B1, B2 |
| D3. Mis campañas (home) | `/campaigns` | C4 |
| D4. Crear campaña | `/campaigns/new` | C1 |
| D5. Confirmación de campaña creada | — (modal/paso post D4) | C1 |
| D6. Unirse con código | `/join` | C2, incluye estado condicional de email sin verificar |
| D7. Elegir o crear personaje | `/join/character` | C3 |
| D8. Hub de campaña — DM | `/campaigns/[id]` (vista DM) | C5 |
| D9. Hub de campaña — Jugador | `/campaigns/[id]` (vista jugador) | C5 |
| D14. Nuevo combate | `/campaigns/[id]/combat/new` (crea) → reutiliza `/combat/[id]/setup` (agregar participantes) | A4, D8. Reemplaza a `/combat` como punto de entrada — ver nota abajo |
| D15. Cierre de loose ends D10-D12 | `/combat/[id]/setup` (links muertos), `addParticipant` (stats no copiados) | D10-D12 |
| D16. 🔴 Anidar Personajes/Grupos bajo campaña (crítico) | `/templates`→`/campaigns/[id]/templates`, `/templates/[id]/edit`→`/campaigns/[id]/templates/[templateId]/edit`, `/groups`→`/campaigns/[id]/groups`, `/groups/new`→`/campaigns/[id]/groups/new`, `/groups/[id]`→`/campaigns/[id]/groups/[groupId]` | D13 (retokenizado ya hecho, se mueve el archivo, no se rehace) |

**Nota sobre D16 — hallazgo durante D13, no un ticket planeado:** hoy, en producción, **crear un personaje o un grupo falla siempre** — `createTemplate`/`createGroup` devuelven `{ error: "Missing campaignId" }` y las páginas lo muestran tal cual al usuario, porque `/templates` y `/groups` son rutas planas que nunca reciben un `campaignId`. Además `getTemplates()`/`getGroups()` (sin scope, usadas por estas páginas) mezclan datos de todas las campañas — a diferencia de `getTemplatesForCampaign`/`getGroupsForCampaign`, que ya existen y ya se usan correctamente en `/combat/[id]/setup` desde D13. Fix: anidar estas 5 rutas bajo `/campaigns/[id]/...`, igual que `/campaigns/[id]/combat/new` (D14a) — el `campaignId` sale gratis del segmento de ruta, hereda el guard de sesión de `proxy.ts` (ya matchea por prefijo `/campaigns`), y permite reemplazar `getTemplates()`/`getGroups()` por sus versiones scopeadas ya existentes. El retokenizado visual de D13 no se rehace, los archivos se mueven de ubicación conservando su contenido. Actualizar también los links del hub de campaña (D8/D9) que hoy apuntan a `/templates`/`/groups` planos.
| D10. Ficha de personaje / detalle en combate | reutiliza lógica de `/combat/[id]` existente | A4, A5 |
| D11. Vista de combate — DM | reutiliza `/combat/[id]` existente, re-scopeada | A4 |
| D12. Vista de combate — Jugador (spectate) | reutiliza `/combat/[id]/spectate` existente, re-scopeada | A4 |
| D13. Retokenizar Personajes, Grupos y Setup de combate | `/templates`, `/templates/[id]/edit`, `/groups`, `/groups/new`, `/groups/[id]`, `/combat/[id]/setup` | A5, A6, reescritura de shell global |

**Nota sobre D13:** hueco real del plan original, no un olvido de ejecución — el backlog nunca contempló re-diseñar estas pantallas, solo reutilizar su lógica (sección 5 del spec técnico). Quedó expuesto recién al reescribir el shell global: estas rutas heredan ahora el fondo oscuro nuevo pero sus componentes internos siguen con clases claras viejas (slate/blue), sin ningún nav que las contenga. `/combat/[id]/setup` se sumó después de D15: quedó como el único paso del flujo de combate (creación → setup → panel/spectate) sin retokenizar, ya que D10-D12 cubrieron panel y spectate pero no setup. Alcance: aplicar los tokens de `sistema-visual-etapa-1.md` a estas 6 rutas — no rediseñar su estructura ni tocar la lógica de campaignId que Épica C/D15 ya conectaron.

**Nota sobre D14:** `/combat/[id]/setup` (agregar participantes, tipear iniciativa) ya funciona y no se reescribe. Lo que falta es el punto de entrada: hoy la única forma de crear un combate es `/combat` — una lista+formulario global, previa a campañas, que contradice la decisión 8 (combate no es ruta de nivel superior) de la misma forma que `/join` contradecía D6 antes de reemplazarlo. `/combat` debería dejar de ser accesible como entry point una vez que exista `/campaigns/[id]/combat/new`, o como mínimo confirmar que su listado no mezcla combates de distintas campañas si se decide dejarlo vivo por ahora.

**Nota de implementación para D8/D9:** una sola ruta, el layout se resuelve por el `role` del `CampaignMember` — no dos páginas separadas, para evitar el drift de estructura que tuvimos en las iteraciones de Stitch (hub DM y jugador divergiendo en contenido sin que fuera intencional).

---

## Épica E — QA y casos borde

- **E1.** Roster vacío al unirse a campaña → confirmar que "Crear mi personaje" está siempre disponible, no solo cuando el roster está vacío (decisión ya cerrada en el diseño). — ✅ cerrado, ver bitácora
- **E2.** Colisión de `inviteCode` al generar — probar que el reintento server-side funciona. — ✅ cerrado, ver bitácora
- **E3.** Combatiente derrotado permanece visible y atenuado en la lista de combate, no se elimina. — ✅ cerrado, ver bitácora
- **E4.** Verificar en el navegador real (no solo el export estático) que ningún elemento `position: fixed` (como el FAB del hub DM) tape contenido interactivo al hacer scroll. — ⏳ **sin verificar en vivo**, ver bitácora (requiere navegador real; sin acceso a la extensión de Chrome en esta sesión)
- **E5.** Confirmar bug conocido de `project-spec.md`: "Start combat with this group" — aprovechar que se está tocando `/combat/[id]/setup` en A4 para arreglarlo en el mismo sprint. — ✅ cerrado, ver bitácora

---

## Orden de ejecución sugerido

1. **Épica A completa** (modelo de datos) — todo lo demás depende de esto.
2. **B1–B3** (auth básico) en paralelo con el final de A.
3. **Épica C** (backend de campañas) una vez cerrada A.
4. **D1–D3** (login/registro/home) pueden arrancar en paralelo con C, ya que dependen más de B que de C.
5. **D4–D7** (crear/unirse/elegir personaje) una vez cerrada C1–C3.
6. **D8–D9** (hubs) una vez cerrada C4–C5.
7. **D10–D12** (combate) en paralelo con D8–D9, dependen solo de A4/A5, no de C.
8. **D13** puede correr en cualquier momento después de la reescritura del shell global — no bloquea ni depende de D4–D12, pero conviene no dejarla para el final: cuanto más tarde se haga, más pantallas nuevas van a estar linkeando hacia rutas visualmente rotas.
9. **Épica E** al final, transversal — pero E5 se puede resolver en cuanto D10–D12 estén tocadas.

---

## Explícitamente fuera de este sprint

Repetido de `etapa-1-decisiones-ux-tecnico.md` sección 7 para que quede a mano del equipo: sin sincronización en tiempo real, sin automatización de reglas (ataques/salvadas/DCs), sin efectos mecánicos de condiciones, sin modo offline. El bloque de "Acciones" con fórmulas de daño que aparece en la ficha de personaje (Stitch) se implementa como dato estático de referencia, sin lógica de tirada conectada.