# Rework — prioridades y decisiones

> **Estado al 2026-11-22: P0, P1 y P2 cerrados y fusionados en `main` (PR #1–#2), más los PR #3–#5. P3 en adelante sin empezar.**
> **2026-11-23: P3–P5 se reemplazan por la versión 2 (fases A–D) en [`v2-historias.md`](./v2-historias.md).**
> Plan original: propuesta del 2026-09-27, aprobado por Gonzalo fase por fase.
> Documentos hermanos: [`registro.md`](./registro.md) (qué hay que hacer y qué se encontró) · [`capas.md`](./capas.md) (dónde vive cada cosa y qué reglas sigue) · [`p2-reglas-personaje.md`](./p2-reglas-personaje.md) · [`catalogo-recursos-clase.md`](./catalogo-recursos-clase.md).
> Etiquetas de evidencia: **[código]** leído en el repo · **[DB]** consulta de solo lectura · **[git]** mensaje de commit o PR · **[docs]** afirmado por documentos, no verificado · **[supuesto]**.

## Objetivo: "estable y usable" (versión 1)

Se considera cumplido cuando, al terminar la Fase 2:

1. Un combate completo en mesa se juega sin esperas perceptibles y sin perder datos.
2. Cada jugador ve su ficha completa.
3. El estado del personaje (HP, condiciones, fatiga, ranuras, recursos de clase) sobrevive entre combates.
4. El entorno no puede perder datos sin aviso: base de desarrollo separada y backup probado.

**Dónde estamos frente al objetivo (2026-11-22):**

| # | Estado | Evidencia |
|---|---|---|
| 1 | Parcial. El tiempo por acción bajó de 2357 ms a 1397 ms (mediana), medido en local; falta medirlo desde Vercel. Hay renders de más en la pantalla de combate (registro T12–T13) | **[git]** PR #1 · **[código]** |
| 2 | Cumplido: ficha de jugador con características, competencias, habilidades, salvaciones, CD de conjuro y recursos | **[código]** `campaigns/[id]/character/` |
| 3 | Parcial. HP, condiciones y agotamiento se guardan al cerrar el combate, en la misma transacción. Ranuras y recursos viven en la plantilla y se gastan fuera del combate; no se usan dentro del combate | **[código]** `endCombat` |
| 4 | Parcial. Base de desarrollo separada: sí. Backup de producción: **sin confirmar** | **[DB]** 2026-11-22 |

## Fases

Tamaños (S/M/L) son estimaciones relativas **[supuesto]**, no horas.

| Fase | Contenido | Criterio de salida | Depende de | Estado |
|---|---|---|---|---|
| **P0 — Fundaciones** (S–M) | 0.1 Base de desarrollo separada + backup de la base real · 0.2 Línea base de migraciones · 0.3 Recrear users (tuyo, sin código) · 0.4 Tests de las reglas puras de combate (`rules.ts`) + `npm test` · 0.5 Instrumentar el lag · 0.6 `.env.example` | La app de desarrollo corre contra su propia base; una restauración de backup probada; `npm test` verde; tiempos por acción medidos y anotados | — | **Cerrada** (PR #1), salvo la restauración de backup, que no está registrada como probada |
| **P1 — Combate fluido y confiable** (M) | 1.1 Corregir el lag según lo medido · 1.2 Que guardar HP no falle en silencio (T3) · 1.3 Errores de acciones de combate en español (opcional) · 1.4 **Playtest 1** de usabilidad | Umbral de espera definido con la medición y cumplido; un combate completo de prueba sin errores; fricciones del playtest anotadas en el registro | P0 | **Cerrada** (PR #1). 1.3 quedó sin hacer (T6). No hay registro escrito del playtest 1 |
| **P2 — Dominio de personaje y persistencia** (L) → **v1** | 2.1 Reglas 2024 escritas (una página) · 2.2 `domain/character/` con funciones puras y tests · 2.3 Estado persistente del personaje (D-2) · 2.4 Contador genérico de recursos: ranuras de hechizo y recursos de clase · 2.5 Ficha v1 · **Playtest 2** | Un jugador ve su ficha completa; el estado sobrevive a dos combates seguidos (verificado en vivo) | P0, decisiones D-2, D-5 | **Cerrada** (PR #2). Después: fatiga en combate (PR #5) y diseño del catálogo de recursos de clase (PR #4, sin construir) |
| **P3 — Cadena de desafíos, MVP** (M–L) | Pasos ordenados por campaña; tipos: tirada de habilidad, salvación, combate, nota; objetivo (grupo o jugador), dificultad, consecuencia; el DM ingresa la tirada | El DM prepara una cadena, la recorre en mesa y las consecuencias se aplican al estado persistente | P2, decisión D-6 | Sin empezar |
| **P4 — Catálogos y contenido** (L) | Patrón único global + contenido del DM (D-3): monstruos (explorar y clonar), hechizos, armas/acciones; lista de hechizos e inventario de armas del personaje | El DM crea contenido propio y clona desde el catálogo; el jugador ve hechizos y armas en su ficha | P2, decisión D-3 | Sin empezar |
| **P5 — Progresión** (M) | Subida de nivel por el DM: puntos de característica y dotes/rasgos por nivel | Una subida de nivel actualiza la ficha derivada sin editar campos a mano | P2, P4 (los rasgos son contenido) | Sin empezar |

P3, P4 y P5 quedan como referencia histórica: su contenido pasa a las fases B (aventuras), C (catálogos de hechizos, armas y armaduras) y D (progresión) de [`v2-historias.md`](./v2-historias.md), con una fase A previa (personaje v2). Orden acordado: A → B → C → D.

### Trabajo en curso (fuera de las fases, 2026-11-22)

Antes de abrir P3 o P4, Gonzalo pidió una ronda de consolidación:

1. Puesta al día: bases reactivadas tras la pausa por inactividad, docs de estado (este cambio), auditoría retrospectiva en PR #6.
2. Historias de usuario de la versión 2: escritas en [`v2-historias.md`](./v2-historias.md) (2026-11-23). La fase A espera aprobación.
3. Rendimiento de la pantalla de combate (T12–T15).
4. Bugs del tracking de combate (T6, T11, T15 y lo que salga de una partida de prueba).
5. Catálogo de recursos de clase (`catalogo-recursos-clase.md`).

## Decisiones

| ID | Decisión | Opciones | Estado |
|---|---|---|---|
| D-1 | Entorno de desarrollo | (a) segundo proyecto Supabase para dev · (b) Postgres local en Docker | **Tomada: (a).** Los dos proyectos de Supabase se pausan si no se usan; si no responden ("tenant/user not found" en el pooler), hay que restaurarlos desde el panel |
| D-2 | Dónde vive el estado del personaje entre combates | (A) copiar del participante al personaje al terminar el combate · (B) escribir en el personaje en cada mutación | **Tomada: (A)**, en la misma transacción que `endCombat`. Riesgo aceptado: cerrar "sin guardar" o abandonar un combate pierde su estado |
| D-3 | Patrón para catálogos (hechizos, monstruos, armas/acciones) | (a) `campaignId` nullable + flag · (b) tablas de sistema de solo lectura + contenido de campaña + operación "clonar a mi campaña" | **Tomada: (b)** (2026-11-23, D-20 en `v2-historias.md`), para hechizos, armas y recursos de clase |
| D-4 | Orden de P3 y P4 | P3→P4 · P4→P3 | **Tomada:** fases A → B → C → D de `v2-historias.md` |
| D-5 | `proficiencyBonus` | (a) derivarlo del nivel (tabla 2024) · (b) seguir editable a mano | **Tomada: (a).** Aplicada solo en la ficha del jugador; el resto de la app sigue usando la columna (T11) |
| D-6 | Concepto de "sesión" | (a) la cadena pertenece a la campaña, con etiqueta libre · (b) entidad `Sesión` nueva | **Tomada: (b)**, entidad Aventura con estado (2026-11-23) |
| D-7 | Fuente del contenido global (P4) | SRD 5.2 (verificar licencia y cobertura) · carga manual propia | Pendiente, se decide al abrir P4 |
| D-8 a D-11 | Competencias y espacios a mano; agotamiento, ataque y CD solo informativos | ver `p2-reglas-personaje.md` | **Tomadas** (2026-10-04) |
| — | Multiclase | — | **Fuera de alcance** (decisión de Gonzalo, 2026-10-11) |
| D-12 a D-20 | Nivel máximo 7, sondeo cada ~10 s, rasgos manuales, catálogos y demás decisiones de la versión 2 | ver `v2-historias.md` §1 | **Tomadas** (2026-11-23) |

## Cómo se trabaja cada fase

Lecciones de la auditoría (`docs/audit/project-audit.md`) convertidas en regla:

1. **Antes de cambiar una entidad o regla compartida:** inventario de quién la consume (se lista en el ticket).
2. **Reglas de dominio por escrito** antes del código; las funciones puras van con tests.
3. **Autorización en cada punto de entrada** nuevo (guard en la acción, no heredado de la pantalla).
4. **Cierre de tarea** con el formato de `CLAUDE.md` (verificado en vivo / por lectura / no verificado).
5. **Aprobación humana** al terminar cada fase antes de empezar la siguiente.
6. **Al cerrar una fase o una ronda, actualizar este documento y `registro.md`.** Entre octubre y noviembre quedaron desactualizados (T10).
