# Fase A — Personaje v2: inventario y plan

> **Estado: alcance y plan aprobados por Gonzalo (2026-11-23), con T16 dentro de A1. A1 terminado: migrado en desarrollo y producción y fusionado en el PR #9 (2026-11-23). A2 fusionado en el PR #10 (2026-11-24). A3 fusionado en el PR #11 (2026-11-24). A5 fusionado en el PR #13 (2026-11-25). A4 programado y probado en local contra desarrollo (2026-11-25), sin fusionar (§11): el código está listo; los datos del catálogo esperan la verificación de Gonzalo antes de cargarse en producción.**
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
| Dado de golpe por clase | d12 Bárbaro · d10 Guerrero, Paladín, Explorador · d8 Artífice, Bardo, Clérigo, Druida, Monje, Pícaro, Brujo · d6 Hechicero, Mago | **[verificar]** (el Artífice no está en el PHB 2024: confirmar contra su libro) |
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

## 5. Tramo A1: lo hecho y decisiones tomadas al programarlo

| Tema | Qué se hizo | Por qué |
|---|---|---|
| Migración `20261123120000_phase_a_character_v2` | Enum `CharacterClass`; en `CharacterTemplate`: `characterClass`, `subclass`, `eyeColor`, `hairColor`, `skinColor`, `height`, `build`, `backstory`, `armorName`, `silver`, `hitDiceUsed`, `tempHp`; tabla `CharacterTrait`; en `CharacterResource`: `shortRestRecoveryAmount` y `fullRecoveryOnShortRest`, con `SHORT` convertido a recuperación total | §4 |
| Nombre `characterClass` en vez de `class` | `class` es palabra reservada de JavaScript: no se puede desestructurar y complica el código | Cambio menor respecto de `catalogo-recursos-clase.md` §3 |
| La columna `recharge` **no se borra** | Queda nula y sin uso, igual que `proficiencyBonus`. La migración no destruye nada y se puede volver atrás. Las dos columnas se eliminan juntas en una migración de limpieza, con confirmación | Regla de operaciones destructivas del `CLAUDE.md` |
| A-H1 decidido: se llena | `CombatParticipant.hitDice` se escribe al agregar el personaje al combate ("3d8") si la plantilla tiene clase | Se ve en la ficha de combate sin cambiar el esquema del participante |
| Competencia (T11) | Sale de `proficiencyForLevel(nivel)` en el alta de participantes, en el mapper del combate (también para combates viejos), en la edición (se muestra, no se edita) y en el alta por invitación. Ningún código lee ni escribe la columna. Monstruos globales: siguen con +2 (no tienen nivel) | D-5 |
| Tope de nivel | `levelError` en el dominio: `PLAYER` 1–7, con la excepción de 7.2; **NPC y monstruos 1–20** (antes no tenían máximo; en producción el mayor es 20) | D-12. El tope 20 para NPC es nuevo: la competencia no está definida por encima |
| Reglas de descanso | `spendHitDice` y `longRestState` en el dominio, con tests. **Todavía no las usa ninguna acción**: se conectan en A3 | A3 |
| T16 | `getTemplatesForCampaign` y `getTemplateById` pasaron a `lib/actions/queries/templates.ts` (sin `"use server"`) | A-H7 |
| Mensajes | Traducidos los de `templates.ts` | A-H5 |
| T17 (sumado a pedido) | `createCombatRecord` → `lib/actions/internal/combat-records.ts`; `getGroupsForCampaign` y `getGroupById` → `lib/actions/queries/groups.ts`; borradas `getActiveCombat`, `getCombatById` y `getCombatByJoinCode` (sin uso) | Misma clase de error que T16 |

## 6. Pasar A1 a producción (hecho el 2026-11-23, con confirmación de Gonzalo)

Resultado: 24 migraciones aplicadas, sin diferencias entre esquema y base; 6 recursos `LONG` → solo descanso largo, 2 `SHORT` → recuperación total; 21 plantillas intactas. Luego se fusionó el PR #9.

Pasos seguidos:

1. Fusionar el PR de A1.
2. Correr `prisma migrate deploy` contra producción con el host impreso antes. La migración solo agrega columnas y una tabla, y convierte los 8 recursos existentes (6 `LONG`, 2 `SHORT`).
3. Verificar: sin diferencias entre esquema y base, y los 2 recursos `SHORT` con `fullRecoveryOnShortRest = true`.

Orden importante: la migración tiene que aplicarse **antes o junto con** el deploy de Vercel, porque el código nuevo lee las columnas nuevas.

## 7. Tramo A2: lo hecho y decisiones

| Tema | Qué se hizo |
|---|---|
| Ficha del jugador (`campaigns/[id]/character`) | Suma clase y subclase, PG temporales, armadura bajo la CA, dados de golpe (restantes/total y dado de la clase, o "sin clase cargada"), rasgos y dotes, armas y acciones guardadas, y el formulario de datos del personaje |
| Lo que edita el jugador (D-17) | `updateCharacterDetails` en `lib/actions/character.ts`, guard `requireTemplateOwner`: datos físicos, historia breve (máx. 300) y plata |
| Lo que edita el DM (D-17) | Clase, subclase y armadura en el formulario de edición (`updateTemplate`, guard `requireCampaignDmAction`). Rasgos en `lib/actions/traits.ts` (`createTrait`, `deleteTrait`, mismo guard) y la sección "Rasgos y dotes" |
| Validación | `domain/character/details.ts`, con tests: textos cortos de 40 caracteres, historia 300, rasgo 60 + 300, plata entera de 0 a 10 000 000 |
| Decisión: rasgo y recurso van separados | H3 dice "si tienen usos, un recurso asociado". No se agregó un vínculo en la base: el rasgo es texto y sus usos se cargan como recurso, con un aviso en la pantalla del DM. Evita otra migración; se puede vincular después si hace falta |
| Decisión: el DM no edita los datos del jugador | D-17 le asigna esos campos al jugador. Un personaje del DM sin dueño queda sin datos físicos hasta que alguien lo reclame |
| Hallazgo corregido (anterior a la fase A) | El formulario de edición del DM descartaba los errores del servidor: si `updateTemplate` rechazaba algo, no guardaba y no avisaba. Ahora lo envuelve `TemplateEditForm.tsx` (cliente): muestra el mensaje, conserva lo escrito y, si sale bien, vuelve al listado como antes. Envía con `onSubmit` porque React 19 vacía el formulario después de una `action`. Corregido a pedido de Gonzalo (2026-11-24) |

## 8. Tramo A3: lo hecho y decisiones

| Tema | Qué se hizo |
|---|---|
| Descanso largo (`longRest`, DM) | Por personaje, con `longRestState`: PG completos, PG temporales a 0, todos los dados de golpe, todos los recursos, −1 de agotamiento (A-H3) |
| Descanso corto (`shortRest`, DM) | Recursos según su regla, incluida la recuperación parcial. La curación fija del DM pasa a ser opcional (vacío = 0) y se valida (entero ≥ 0); antes no se validaba |
| Dados de golpe (`spendHitDice` en `lib/actions/character.ts`, dueño) | El jugador elige cuántos dados gasta y escribe el total con su mod. de CON (D-14). Regla `hitDiceHeal` en el dominio, con tests: sin clase no se puede, no se gastan más de los que quedan, el total va de 0 a dados × (dado + mod. CON positivo), los PG no pasan del máximo. Escritura condicionada al valor leído para que dos clics seguidos no gasten de más |
| PG temporales (A-H2) | `endCombat` con guardado de estado los escribe en la plantilla; al agregar el personaje a un combate (uno o por grupo) se copian al participante |
| Panel de descanso | Aparece siempre que haya PJ o PNJ. Antes solo con alguien herido, pero el descanso también repone recursos, dados y agotamiento |
| Decisión: no hay "descanso abierto" | La app no modela la sesión de descanso: el jugador puede gastar dados desde su ficha en cualquier momento y la mesa lo controla. Modelarlo pide estado nuevo en la base |
| Decisión: el DM no gasta dados por un PNJ | Solo el dueño gasta dados. Para un PNJ, el DM usa la curación fija del descanso corto |

## 9. Tramo A5: lo hecho y decisiones

| Tema | Qué se hizo |
|---|---|
| Panel `/campaigns` (H1, H6) | Nombre y email del usuario con link al perfil; secciones "Juego en" y "Dirijo". En las de jugador, nombre y nivel del personaje propio o "Todavía no tenés personaje". En las de DM, la cantidad de jugadores. Los datos salen de `GET /api/campaigns` (campos nuevos `user`, `character`, `playerCount`; `/profile` usa la misma ruta y no cambia) |
| Aviso en la campaña (H4) | Un jugador miembro sin personaje ve "Crear o elegir personaje", que lleva a `/join/character` |
| Permiso nuevo en `/api/campaigns/[id]/join/character` | Antes rechazaba a cualquier miembro (`ALREADY_MEMBER`), así que el aviso de H4 llevaba a una pantalla que fallaba. Ahora decide `joinMode` (`domain/campaign/join.ts`, con tests): quien no es miembro entra como jugador nuevo (igual que antes); un **jugador** miembro **sin personaje** puede reclamar o crear uno y conserva su membresía; el DM y el jugador que ya tiene personaje siguen rechazados. Dentro de la transacción se vuelve a contar el personaje propio para que un doble envío no deje dos. El reclamo sigue siendo atómico y el nivel nuevo sigue con tope 7 |
| Texto de la pantalla de reclamo | Corregido (2026-11-25): a quien ya es jugador le dice "Ya sos parte de … pero todavía no tenés personaje" (`isMember` en la respuesta del GET) |

## 10. Pruebas en vivo pendientes, hechas el 2026-11-25

En local contra la base de desarrollo, con los usuarios `[PRUEBA-A2]` (DM) y `[PRUEBA-A5]` (jugadora):

| Prueba | Resultado |
|---|---|
| Un jugador abre la edición de un personaje ajeno | 404, sin formulario |
| PV temporales entre combates | La plantilla con 6 → el participante nuevo arranca con 6. El participante con 9 → al terminar "guardando PV", la plantilla queda en 9 |
| Vista de celular (390 px) en panel, campaña, ficha completa y reclamo | Sin desborde horizontal; la ficha queda en grilla de 2 columnas |

## 11. Tramo A4: lo hecho y decisiones

| Tema | Qué se hizo |
|---|---|
| Tabla `ClassResourceTemplate` | Catálogo global de solo lectura: clase, nombre, desde qué nivel, regla de recarga, máximo sugerido (por umbrales de nivel o proporcional al nivel), nota y `verified`. Migración `20261125120000_add_class_resource_catalog`: solo crea la tabla |
| Datos | `prisma/seed-data/class-resources.json`: 16 filas para las 13 clases, niveles 1–7, todas `verified: false`. Salen de la hoja "Recursos de clase" de `catalogos.xlsx`, que es donde Gonzalo las verifica |
| Carga | `npm run seed:class-resources -- --target=dev` o `--target=prod`. A diferencia de la semilla de monstruos, exige el destino, lee el archivo de entorno de ese destino, imprime host y proyecto y se corta si no coincide. Idempotente (upsert por clase y nombre); no borra filas |
| Selector "Elegir del catálogo" | En la sección de recursos de la edición del personaje, filtrado por su clase. Las filas de un nivel mayor aparecen deshabilitadas ("desde nivel N"). Elegir una precarga nombre, recarga y un máximo sugerido para el nivel actual; el DM lo revisa antes de agregar (D-15). Si el máximo depende de un modificador, queda vacío con un aviso. Si la fila no está verificada, lo dice |
| Decisión: pools | Imposición de manos y los puntos (hechicería, concentración) son un recurso común cuyo contador cuenta puntos. El tope de un recurso sube de 20 a 100 (`MAX_RESOURCE`). Cierra la pregunta §8.2 de `catalogo-recursos-clase.md` |
| Fuera de A4 | La tabla automática de espacios de conjuro (`catalogo-recursos-clase.md` §5) y los recursos de subclase |
| Producción | Pendiente: aplicar la migración y cargar el catálogo **después** de que Gonzalo verifique la hoja |

## 12. Lo que no entra en la fase A

- Hechizos y espacios de conjuro desde la tabla (fase C). Los espacios siguen cargándose a mano como recursos.
- Armas y armaduras del catálogo (fase C). Las armas siguen siendo acciones manuales.
- Subida de nivel y reparto de puntos (fase D).
- Cálculo de la CA desde la armadura (7.4).
