# Rework — prioridades y decisiones

> **Estado: PROPUESTA (2026-09-27). Nada de esto está aprobado hasta que Gonzalo lo marque.**
> Documentos hermanos: [`registro.md`](./registro.md) (qué hay que hacer y qué se encontró) · [`capas.md`](./capas.md) (dónde vive cada cosa y qué reglas sigue).
> Etiquetas de evidencia: **[código]** leído en el repo · **[DB]** consulta de solo lectura del 2026-09-27 · **[docs]** afirmado por documentos, no verificado · **[supuesto]**.

## Objetivo: "estable y usable" (versión 1)

Se considera cumplido cuando, al terminar la Fase 2:

1. Un combate completo en mesa se juega sin esperas perceptibles y sin perder datos.
2. Cada jugador ve su ficha completa.
3. El estado del personaje (HP, condiciones, fatiga, ranuras, recursos de clase) sobrevive entre combates.
4. El entorno no puede perder datos sin aviso: base de desarrollo separada y backup probado.

## Fases

Tamaños (S/M/L) son estimaciones relativas **[supuesto]**, no horas.

| Fase | Contenido | Criterio de salida | Depende de |
|---|---|---|---|
| **P0 — Fundaciones** (S–M) | 0.1 Base de desarrollo separada + backup de la base real · 0.2 Línea base de migraciones · 0.3 Recrear users (tuyo, sin código) · 0.4 Tests de las reglas puras de combate (`rules.ts`) + `npm test` · 0.5 Instrumentar el lag · 0.6 `.env.example` | La app de desarrollo corre contra su propia base; una restauración de backup probada; `npm test` verde; tiempos por acción medidos y anotados | — |
| **P1 — Combate fluido y confiable** (M) | 1.1 Corregir el lag según lo medido · 1.2 Que guardar HP no falle en silencio (T3) · 1.3 Errores de acciones de combate en español (opcional) · 1.4 **Playtest 1** de usabilidad | Umbral de espera definido con la medición y cumplido; un combate completo de prueba sin errores; fricciones del playtest anotadas en el registro | P0 |
| **P2 — Dominio de personaje y persistencia** (L) → **v1** | 2.1 Reglas 2024 escritas (una página) · 2.2 `domain/character/` con funciones puras y tests · 2.3 Estado persistente del personaje (D-2) · 2.4 Contador genérico de recursos: ranuras de hechizo y recursos de clase · 2.5 Ficha v1 · **Playtest 2** | Un jugador ve su ficha completa; el estado sobrevive a dos combates seguidos (verificado en vivo) | P0, decisiones D-2, D-5 |
| **P3 — Cadena de desafíos, MVP** (M–L) | Pasos ordenados por campaña; tipos: tirada de habilidad, salvación, combate, nota; objetivo (grupo o jugador), dificultad, consecuencia; el DM ingresa la tirada | El DM prepara una cadena, la recorre en mesa y las consecuencias se aplican al estado persistente | P2, decisión D-6 |
| **P4 — Catálogos y contenido** (L) | Patrón único global + contenido del DM (D-3): monstruos (explorar y clonar), hechizos, armas/acciones; lista de hechizos e inventario de armas del personaje | El DM crea contenido propio y clona desde el catálogo; el jugador ve hechizos y armas en su ficha | P2, decisión D-3 |
| **P5 — Progresión** (M) | Subida de nivel por el DM: puntos de característica y dotes/rasgos por nivel | Una subida de nivel actualiza la ficha derivada sin editar campos a mano | P2, P4 (los rasgos son contenido) |

Orden de P3 y P4: **decisión tuya (D-4)**. Recomiendo P3 primero: solo depende de P2 y responde a tu necesidad de planificar la próxima sesión.

## Decisiones pendientes

| ID | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D-1 | Entorno de desarrollo | (a) segundo proyecto Supabase para dev · (b) Postgres local en Docker | (a): mismo motor y pooler, sin instalar nada. Verificar qué backups incluye tu plan antes de confiar en él |
| D-2 | Dónde vive el estado del personaje entre combates | (A) copiar del participante al personaje al terminar el combate (extiende `saveHpToTemplates`) · (B) escribir en el personaje en cada mutación | (A) con escritura atómica junto con `endCombat`, y campos de estado nuevos en el personaje. (B) duplica escrituras y empeora el lag. Riesgo de (A): un combate abandonado pierde su estado |
| D-3 | Patrón para catálogos (hechizos, monstruos, armas/acciones) | (a) `campaignId` nullable + flag · (b) tablas de sistema de solo lectura + contenido de campaña + operación "clonar a mi campaña" | (b): evita repetir el bug de consultas sin scope (D16). El DM "personaliza" clonando |
| D-4 | Orden de P3 y P4 | P3→P4 · P4→P3 | P3→P4 |
| D-5 | `proficiencyBonus` | (a) derivarlo del nivel (tabla 2024) · (b) seguir editable a mano | (a). Si necesitas homebrew, un override opcional |
| D-6 | Concepto de "sesión" | (a) la cadena pertenece a la campaña, con etiqueta libre · (b) entidad `Sesión` nueva | (a) para el MVP; hoy no existe ninguna entidad de sesión **[código]** |
| D-7 | Fuente del contenido global (P4) | SRD 5.2 (verificar licencia y cobertura) · carga manual propia | Decidir al iniciar P4 |

## Cómo se trabaja cada fase

Lecciones de la auditoría (`docs/audit/project-audit.md`) convertidas en regla:

1. **Antes de cambiar una entidad o regla compartida:** inventario de quién la consume (se lista en el ticket).
2. **Reglas de dominio por escrito** antes del código; las funciones puras van con tests.
3. **Autorización en cada punto de entrada** nuevo (guard en la acción, no heredado de la pantalla).
4. **Cierre de tarea** con el formato de `CLAUDE.md` (verificado en vivo / por lectura / no verificado).
5. **Aprobación humana** al terminar cada fase antes de empezar la siguiente.
