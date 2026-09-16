# D&D Combat Tracker

> Wordmark interno actual: **GRIMOIRE** (placeholder, decisión 9 — puede cambiar).

Tracker de combate para grupos de D&D: campañas con miembros y roles (DM / Jugador),
gestión de personajes y grupos de encuentro, y una pantalla de combate en vivo para el DM
con vista espejo (de solo lectura cualitativa) para los jugadores.

Documento de referencia sobre **qué existe hoy realmente** en el código (no un roadmap):
[`project-spec.md`](./project-spec.md). Este README es solo la puerta de entrada para
levantar el proyecto localmente.

---

## Stack

- **Next.js 16** (App Router) + **React 19** + TypeScript.
  ⚠️ Esta versión de Next tiene cambios de convención respecto de lo habitual — ver
  [`AGENTS.md`](./AGENTS.md) antes de escribir código nuevo (`middleware.ts` → `src/proxy.ts`,
  `params`/`searchParams` son `Promise`).
- **Tailwind CSS 4**, con tokens de diseño propios (namespace `gothic-*` en
  `src/app/globals.css`). Fuente de verdad visual:
  [`docs/etapa-1/sistema-visual-etapa-1.md`](./docs/etapa-1/sistema-visual-etapa-1.md) —
  leerlo antes de generar o tocar cualquier pantalla.
- **Zustand** para el estado de combate en cliente, con mutaciones optimistas
  (`src/stores/combatStore.ts`, `src/hooks/useCombatMutation.ts`).
- **PostgreSQL (Supabase) + Prisma 5** (`prisma/schema.prisma`).
- **NextAuth v5 (beta)**, JWT, con Google, Discord y credenciales (email + contraseña).
- **Resend** para email transaccional (verificación de cuenta).
- **Playwright** para e2e (`e2e/`) — ver [`CONTRIBUTING.md`](./CONTRIBUTING.md).

No hay backend separado: conviven Route Handlers (`src/app/api/**`) y Server Actions
(`src/lib/actions/**`), cada mutación valida su propia autorización.

---

## Empezar

### 1. Requisitos

- Node.js (versión compatible con Next 16 — ver `package.json`/`.nvmrc` si existe)
- Una base PostgreSQL accesible (típicamente un proyecto de Supabase, también sirve local)

### 2. Variables de entorno

No hay `.env.example` versionado hasta ahora — se agrega en este mismo cambio. Copiá y completá:

```bash
cp .env.example .env
```

Ver el detalle de cada variable en [`.env.example`](./.env.example).

### 3. Instalar y preparar la base

```bash
npm install
npx prisma migrate deploy   # aplica las migraciones existentes
# npx prisma studio          # opcional, para inspeccionar datos
```

### 4. Levantar el servidor de desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). La raíz `/` no tiene `page.tsx` propio:
depende de `src/proxy.ts` para redirigir a `/campaigns` o `/login` según haya sesión.

---

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run test:e2e` (alias de `npx playwright test`) | Suite e2e completa (headless) |

Detalle de e2e (seed de datos, requisitos de DB, cómo correr un solo spec):
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## Documentación del proyecto

| Documento | Para qué sirve |
|---|---|
| [`project-spec.md`](./project-spec.md) | **Empezar por acá si vas a tocar código.** Estado real del sistema post Sprint 2: stack, modelo de datos, rutas implementadas, decisiones que restringen el diseño, pendientes conocidos y deuda técnica. |
| [`docs/etapa-1/sistema-visual-etapa-1.md`](./docs/etapa-1/sistema-visual-etapa-1.md) | Sistema visual: tokens de color/tipografía, componentes reutilizables, y cómo pedir pantallas nuevas sin repetir el drift ya corregido. |
| [`docs/etapa-1/spec-tecnico-etapa-1.md`](./docs/etapa-1/spec-tecnico-etapa-1.md) | Spec técnico y bitácora de la Etapa 1 (campañas, roles, auth). |
| [`docs/etapa-1/sprint-1-backlog.md`](./docs/etapa-1/sprint-1-backlog.md) | Tickets de Sprint 1. |
| [`docs/etapa-2/sprint-2-backlog.md`](./docs/etapa-2/sprint-2-backlog.md) | Tickets de Sprint 2 (navegación, cuenta, gestión de campaña). |
| [`docs/etapa-3/spec-tecnico-etapa-3-monstruos.md`](./docs/etapa-3/spec-tecnico-etapa-3-monstruos.md) | Spec técnico: roster global de monstruos (Sprint 3). |
| [`docs/etapa-3/spec-tecnico-etapa-3-acciones-tiradas.md`](./docs/etapa-3/spec-tecnico-etapa-3-acciones-tiradas.md) | Spec técnico: acciones guardadas y resolución de tiradas en combate (Sprint 3). Las salvaciones quedan fuera a propósito — ver el documento. |
| [`roadmap-futuro.md`](./roadmap-futuro.md) | Memoria de Sprints 3–6, sin nivel de detalle de backlog todavía. **Nota:** Sprint 3 ya tiene specs técnicos más detallados que este resumen (los dos archivos de arriba) — si hay contradicción entre ambos, ganan los specs técnicos. |
| [`AGENTS.md`](./AGENTS.md) | Convenciones para agentes de código sobre esta versión particular de Next.js. |
| [`CLAUDE.md`](./CLAUDE.md) | Formato de reporte al cerrar una tarea (aplica a Claude Code / agentes). |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Cómo correr y escribir tests e2e. |

---

## Convenciones a tener presentes

- **App en español** (decisión 12) — copy, labels y mensajes de error de cara al usuario van
  en español. Hoy hay una excepción residual conocida (mensajes de error en inglés en algunas
  Server Actions) — ver `project-spec.md` §7.3 antes de asumir que es intencional.
- **Sin sincronización en tiempo real todavía** — ninguna pantalla puede asumir que dos
  dispositivos ven el mismo estado sin recargar. Es Sprint 5 en el roadmap.
- **El personaje pertenece a la campaña, no es portable** entre campañas (decisión vigente
  desde la Etapa 1) — el roster global de monstruos de Sprint 3 la contradice a propósito,
  ver la nota de arquitectura en `roadmap-futuro.md`.

Para cualquier cambio que toque autorización, una función compartida
(`computeTurnOrder`, `computeCurrentActor`, guards de `action-guards.ts`) o un default que se
aplica en más de un lugar: leer `CLAUDE.md` antes de reportar la tarea como cerrada.