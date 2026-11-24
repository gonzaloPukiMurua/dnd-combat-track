# Fase A — Personaje v2: inventario y plan

> **Estado: alcance aprobado por Gonzalo (2026-11-23). Este plan está en revisión; ningún tramo se programa hasta que lo apruebe.**
> Alcance: historias H1, H3, H4, H6 y H16, U13, T11 y el tope de nivel 7 de [`v2-historias.md`](./v2-historias.md).
> Etiquetas: **[código]** leído en `main` @ `7f7a79b` · **[DB]** consulta de solo lectura · **[regla]** · **[verificar]** contra el PHB 2024 · **[decidir]**.

---

## 1. Inventario: quién usa `CharacterTemplate`

### 1.1 Escrituras (todas tienen que respetar los campos y validaciones nuevas)

| Archivo | Función | Qué escribe | Guard |
|---|---|---|---|
| `lib/actions/templates.ts` | `createTemplate` | alta por el DM (todos los campos de stats vía `parseStatFields`) | `requireDm` |
| `lib/actions/templates.ts` | `updateTemplate` | edición por el DM | `requireDm` |
| `lib/actions/templates.ts` | `deleteTemplate` | borrado | DM |
| `lib/actions/templates.ts` | `longRest` | `currentHp = null` y recursos a 0 usados | DM |
| `lib/actions/templates.ts` | `shortRest` | curación escrita por el DM y recursos de recarga corta | DM |
| `lib/actions/sheet.ts` | (configuración de ficha) | competencias, pericia, característica de conjuro | DM |
| `lib/actions/character.ts` | (notas) | `notes`, la edita el jugador dueño | dueño |
| `lib/actions/combat.ts` | `endCombat` | `currentHp`, `conditions`, `exhaustionLevel` | `requireCombatDm` |
| `api/campaigns/[id]/join/character/route.ts` | `POST` | reclamo atómico (`ownerId`) o alta por el jugador | sesión + email verificado |

### 1.2 Lecturas que copian datos de la plantilla

- `lib/actions/combat.ts`, alta de participantes: copia `level`, **`proficiencyBonus`** (la columna, no el cálculo: T11), características, condiciones y agotamiento al `CombatParticipant`. Los monstruos del catálogo global no traen nivel ni competencia y caen en los valores por defecto (1 y +2).
- `lib/actions/mappers/combat.ts`: arma la vista del combate.
- Ficha del jugador `campaigns/[id]/character/page.tsx`: única pantalla que usa el dominio (`domain/character/rules.ts`) para la competencia.
- Listados con `level`: hub de campaña, `/join/character`, `CharacterPicker`, `api/campaigns/[id]` y `CombatantSheet` en combate.

### 1.3 Hallazgos del inventario

| ID | Hallazgo | Evidencia | Qué se hace en la fase A |
|---|---|---|---|
| A-H1 | `CombatParticipant.hitDice` existe pero **nadie lo escribe**: siempre es `null`, así que "DG" no se muestra nunca en combate | **[código]** búsqueda de `hitDice` en `src/` | Se calcula desde la clase y el nivel; se elimina el campo del participante o se llena al crearlo **[decidir en A1]** |
| A-H2 | Los PG temporales no se guardan al cerrar el combate: cada combate empieza con 0 | **[código]** `combat.ts`, `tempHp: 0` en el alta | Se guardan en la plantilla con el resto del estado (D-2) y el descanso largo los pone en 0 **[verificar]** |
| A-H3 | El descanso largo no baja el agotamiento | **[código]** `longRest` no toca `exhaustionLevel` | Baja 1 nivel (`p2-reglas-personaje.md` §2.7) |
| A-H4 | La validación de nivel solo exige `≥ 1`; no hay tope | **[código]** `parseStatFields` | Tope 7 para `PLAYER`, con excepción para los 2 personajes de nivel 8 (§3) |
| A-H5 | Los mensajes de error de `templates.ts` están en inglés | **[código]** | Se traducen los que toque este trabajo (parte de T6) |
| A-H6 | La recarga de recursos (`SHORT`/`LONG`) se usa en 7 archivos | **[código]** `resources.ts` (dominio y acción), `ResourcesManager`, `ResourceCounter`, ficha, edición de plantilla, descansos | Se generaliza según `catalogo-recursos-clase.md` §2.1 y se actualizan los 7 |
| A-H7 | `getTemplatesForCampaign` y `getTemplateById` están exportadas desde un archivo `"use server"` sin ningún guard. Todo lo que exporta un archivo así es una Server Action que se puede llamar desde fuera de la pantalla que la usa (registro T16) | **[código]** `lib/actions/templates.ts:84-97`. Que se pueda explotar depende de que el ID de la acción llegue al navegador **[supuesto]** | Se mueven a un módulo de consultas sin `"use server"`, que solo usan las páginas del servidor (que ya tienen guard). Es una corrección de seguridad que no estaba en el alcance aprobado; entra en A1 porque toca el mismo archivo |

---

## 2. Tramos

Cada tramo termina con `npm test` en verde, `npm run build` sin errores y una verificación en la base de desarrollo. Uno por PR.

| Tramo | Contenido | Historias | Tamaño |
|---|---|---|---|
| **A1. Esquema y reglas** | Una migración con: clase (enum de 12) y subclase (texto); datos físicos; historia breve; nombre de armadura; plata; dados de golpe usados; PG temporales en la plantilla; tabla de rasgos y dotes (nombre + descripción); recarga generalizada de recursos. Dominio: dado de golpe por clase, tope de nivel, reglas de descanso. Competencia calculada desde el nivel en todo el código (T11), incluido el alta de participantes | T11, A-H1, A-H4, A-H6, A-H7 | M |
| **A2. Ficha completa** | Pantalla de ficha con todos los campos de H3. Formulario del jugador (datos físicos, historia breve, plata) y del DM (clase, subclase, armadura, rasgos). Guards separados por grupo de campos (D-17) | H3 | M |
| **A3. Descansos** | Descanso corto: el jugador gasta dados de golpe y escribe la tirada; los recursos recuperan según su regla. Descanso largo: PG completos, dados de golpe, recursos, PG temporales a 0, −1 de agotamiento. El estado de los PG temporales se guarda al cerrar el combate | H16, A-H2, A-H3 | M |
| **A4. Catálogo de recursos de clase** | Tabla global y semilla desde un JSON, niveles 1–7. Selector "Elegir del catálogo" en `ResourcesManager`, filtrado por clase. Depende de que Gonzalo confirme las filas | U13 | S–M |
| **A5. Paneles y alta de personaje** | Panel con "Juego en" / "Dirijo" y datos del usuario. Aviso y acceso a crear o reclamar personaje para un miembro sin personaje | H1, H4, H6 | S |

Orden: A1 → A2 → A3; A4 y A5 pueden ir en cualquier momento después de A1.

---

## 3. Reglas que se aplican en el dominio

| Regla | Valor | Estado |
|---|---|---|
| Dado de golpe por clase | d12 Bárbaro · d10 Guerrero, Paladín, Explorador · d8 Bardo, Clérigo, Druida, Monje, Pícaro, Brujo · d6 Hechicero, Mago | **[verificar]** |
| Dados de golpe totales | igual al nivel | **[regla]** |
| Descanso largo y dados de golpe | 2024: se recuperan **todos** (en 2014 era la mitad). Corrige lo que dice `v2-historias.md` H16 | **[verificar]** |
| PG temporales | duran hasta gastarse o hasta terminar un descanso largo | **[verificar]** |
| Tope de nivel | `PLAYER`: 1–7. Excepción: si el personaje ya tiene un nivel mayor guardado, se puede editar el resto sin cambiar el nivel, pero no se puede subir | decidido (7.1, 7.2) |
| Competencia | siempre `proficiencyBonus(level)`; la columna deja de leerse | decidido (D-5) |

---

## 4. Migración y datos existentes

- Todos los campos nuevos son opcionales o tienen valor por defecto: ningún personaje existente se rompe.
- **Recarga de recursos:** los valores existentes se convierten (`LONG` → sin recuperación en descanso corto; `SHORT` → recuperación total en descanso corto). Sin cambio de comportamiento. Es el único paso que transforma datos.
- **Columna `proficiencyBonus`:** se deja de leer en A1 y se elimina en una migración posterior, una vez verificado que nada la usa **[decidir]**.
- Producción: 21 plantillas, incluidos 2 PJ de nivel 8 que no se tocan **[DB]**.
- Procedimiento: migración en desarrollo → verificación → aprobación tuya → producción, con el host impreso antes de aplicar.

---

## 5. Lo que no entra en la fase A

- Hechizos y espacios de conjuro desde la tabla (fase C). Los espacios siguen cargándose a mano como recursos.
- Armas y armaduras del catálogo (fase C). Las armas siguen siendo acciones manuales.
- Subida de nivel y reparto de puntos (fase D).
- Cálculo de la CA desde la armadura (7.4).
