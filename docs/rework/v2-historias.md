# Versión 2 — historias de usuario, fases y alcance

> **Estado: alcance acordado en conversación (2026-11-23). Cada fase necesita aprobación explícita antes de empezar a programarla.**
> **Fase A: alcance aprobado (2026-11-23).** Plan e inventario en [`fase-a-plan.md`](./fase-a-plan.md).
> Si al trabajar aparece una diferencia con este documento, se conversa y se negocia; el cambio que se acuerde se anota acá (§8) antes de implementarlo.
> Reemplaza el contenido de las fases P3, P4 y P5 de [`README.md`](./README.md); P0–P2 siguen cerradas.
> Documentos relacionados: [`registro.md`](./registro.md) · [`p2-reglas-personaje.md`](./p2-reglas-personaje.md) · [`catalogo-recursos-clase.md`](./catalogo-recursos-clase.md).
> Etiquetas: **[código]** leído en el repo (`main` @ `ec83338`) · **[DB]** consulta de solo lectura del 2026-11-23 · **[regla]** confirmado contra el libro · **[verificar]** falta confirmar contra el PHB 2024 · **[decidir]** decisión pendiente.

---

## 1. Decisiones tomadas

| ID | Decisión | Consecuencia |
|---|---|---|
| D-12 | **Nivel máximo 7 para personajes de jugador.** Es un límite real para no tener que cargar dotes, rasgos ni hechizos por encima de ese nivel | Hechizos hasta nivel 4. Rasgos y recursos de clase solo de los niveles 1–7. Validación de `level ≤ 7` en el alta, la edición y la subida de nivel de personajes `PLAYER`. Monstruos y NPC no tienen tope (§7.1) |
| D-13 | **Tiempo real por sondeo**, no sincronización completa. La pantalla del jugador consulta el estado cada ~10 s | El jugador ve el bloque actual y su ficha con hasta ~10 s de demora. Unirse a una aventura es marcar "presente" |
| D-14 | **La app no tira dados.** El jugador tira dados físicos y el DM escribe el resultado; la app lo compara con la dificultad y lo guarda | Igual que D-11. Aplica a pruebas de habilidad, salvaciones y la salvación de CON por fatiga |
| D-15 | **Rasgos y dotes con cálculo manual.** El catálogo trae nombre, recarga y una nota de cómo escala; el DM pone el máximo; la app cuenta usos y recarga en los descansos | Igual que `catalogo-recursos-clase.md` §4. Lo único que se calcula solo: competencia, modificadores, CD y bono de conjuro, espacios de conjuro |
| D-16 | **Acciones guardadas:** se amplía `TemplateAction` con un tipo "hechizo" ligado a un hechizo y al nivel de espacio | Gastar el espacio automáticamente al usar la acción queda fuera de esta versión |
| D-17 | **Quién edita qué.** El jugador edita datos físicos, historia breve, dinero y el reparto de puntos al subir de nivel. El DM edita todo lo mecánico (clase, subclase, características, armadura, competencias, rasgos, PG máximos) | Un guard distinto para cada grupo de campos |
| D-18 | **Bloque de combate = combate normal.** Al activar el bloque se crea un combate con los enemigos elegidos. Los "opcionales" se suman con el botón que ya existe para agregar participantes en medio del combate. Al cerrar el combate, la aventura queda lista para avanzar | Reutiliza todo el tracker actual sin cambios de fondo |
| D-19 | **Ramas elegidas por el DM.** Cada bloque guarda una lista de bloques siguientes; al avanzar, el DM elige a cuál ir | No hay ramas automáticas según el resultado |
| D-20 | **Catálogos de hechizos, armas y armaduras** con el mismo patrón: tabla global de solo lectura + contenido propio del DM por campaña | Cierra D-3 con la opción (b). D-7 (fuente del contenido) se resuelve con la investigación de §6 |
| D-4 | Orden de las fases | **Cerrada: A → B → C → D** (§3) |
| D-6 | Concepto de sesión | **Cerrada:** entidad nueva **Aventura**, con estado, perteneciente a una campaña |

---

## 2. Fuera de esta versión

- Multiclase.
- Niveles 8–20 para jugadores.
- Cálculo automático del máximo de rasgos y recursos de clase.
- Ramas automáticas según el resultado de un bloque.
- Que la app tire dados.
- Sincronización en tiempo real completa (websockets, presencia en vivo).
- Gastar espacios de conjuro o recursos automáticamente al usar una acción.
- Recursos de subclase muy específicos (dados de superioridad, invocaciones), salvo que se acuerde sumarlos al catálogo.

---

## 3. Fases

Los tamaños son relativos (S/M/L) **[supuesto]**, no horas.

| Fase | Contenido | Tamaño | Depende de |
|---|---|---|---|
| **A. Personaje v2** | Historias H1–H4, H6, H16; catálogo de recursos de clase (U13); arreglo de competencia (T11); tope de nivel 7 | L | — |
| **B. Aventuras** | H2 (aventura del día), H7–H13, H15 | L | A |
| **C. Catálogos de hechizos, armas y armaduras** | H17; lista de hechizos, armas y armadura del personaje; espacios de conjuro desde la tabla | M–L | A, listas de Gonzalo (§6, §7.5) |
| **D. Progresión** | H5, H14 | M | A (clase modelada) |

Las armas de la ficha (H3) se cargan en la fase A como acciones manuales (ya existe `TemplateAction`); en la fase C pasan a elegirse del catálogo.

---

## 4. Historias de usuario

Formato: historia → hoy → criterio de aceptación. "Hoy" es lo que existe en el código.

### Fase A — Personaje v2

**H1 — Panel del jugador.** Como jugador quiero ver un panel con las campañas en las que juego, además de mi usuario y mis datos básicos.
- Hoy: `/campaigns` lista todas mis campañas con una etiqueta DM/Jugador; `/profile` existe aparte **[código]**.
- Criterio: el panel separa "Juego en" y "Dirijo"; muestra nombre de usuario y email; cada campaña de jugador muestra el nombre y nivel de mi personaje.

**H6 — Panel del DM.** Como DM quiero ver las campañas que dirijo.
- Hoy: misma pantalla que H1.
- Criterio: la sección "Dirijo" de H1, con la cantidad de jugadores y la aventura activa (cuando exista la fase B).

**H2 (parte A) — Dentro de la campaña, como jugador.** Quiero un link a la ficha de mi personaje.
- Hoy: existe **[código]** `campaigns/[id]/page.tsx`.
- Criterio: sin cambios en la fase A; el link a la aventura del día se agrega en la fase B.

**H3 — Ficha completa.** Como jugador quiero ver todos los datos de mi personaje.
- Hoy: características, modificadores, competencias, habilidades, salvaciones, CD y bono de conjuro, recursos, PG máximos y actuales, agotamiento y notas **[código]**. Los PG temporales y los dados de golpe solo existen dentro del combate.
- Criterio, campos nuevos:
  - Datos físicos: color de ojos, cabello y piel; altura; contextura; peso. Texto corto, todos opcionales. Los edita el jugador.
  - Historia breve: máximo 300 caracteres, validado en el servidor. La edita el jugador.
  - Clase (enum de 12 clases) y subclase (texto, o lista por clase si el catálogo la trae). Las edita el DM.
  - Armadura: nombre y CA base; la CA final sigue siendo `baseAc` hasta que se acuerde calcularla. La edita el DM.
  - Dinero: un solo número en piezas de plata. Lo edita el jugador.
  - Rasgos y dotes: lista con nombre, descripción breve y, si tienen usos, un recurso asociado (D-15).
  - Armas y acciones guardadas: las acciones existentes (ataque, curación; acción, bonus o reacción). El tipo "hechizo" se agrega en la fase C (D-16).
  - Dados de golpe: tipo de dado según la clase, total igual al nivel, usados.
  - PG máximos, actuales y temporales; agotamiento.
  - Bono de competencia calculado desde el nivel en **todas** las pantallas (cierra T11).

**H4 — Crear o elegir personaje.** Como jugador sin personaje en la campaña quiero crearlo, o elegir uno que el DM creó y nadie reclamó.
- Hoy: existe solo al unirse con código (`/join/character`, reclamo atómico) **[código]**.
- Criterio: un miembro sin personaje ve un aviso con el link a esa misma pantalla; el reclamo sigue siendo atómico; un personaje nuevo no puede superar el nivel 7.

**H16 — Descansos.** Como DM quiero dar un descanso corto o largo en cualquier momento.
- Hoy: existen `shortRest` y `longRest`, los activa el DM desde `RestPanel` **[código]**.
- Criterio:
  - Descanso corto: el jugador puede gastar dados de golpe y escribir lo que sacó en la tirada + mod. CON (D-14). Los recursos se recuperan según su regla, incluida la recuperación parcial (`catalogo-recursos-clase.md` §2.1).
  - Descanso largo: PG completos, recursos y espacios completos, recupera los dados de golpe (en 2024, todos; en 2014 era la mitad) **[verificar]** y baja 1 nivel de agotamiento.

**U13 — Catálogo de recursos de clase**, ya diseñado en `catalogo-recursos-clase.md`, recortado a los niveles 1–7 (D-12).

### Fase B — Aventuras

**Estados de una aventura:** borrador → pendiente (esperando jugadores) → activa → terminada.

**H7 — Campaña del DM.** Como DM, dentro de una campaña quiero ver las aventuras anteriores, un botón para crear una nueva, y los PJ, NPC y monstruos de la campaña.
- Hoy: combates anteriores y links a plantillas y grupos **[código]**.
- Criterio: secciones de aventuras (activa, pendientes, terminadas), personajes de jugador y NPC/monstruos de la campaña.

**H8 — Crear aventura.** Como DM quiero armar una aventura con bloques en fila, con la posibilidad de ramas.
- Criterio: cada bloque tiene un título, un tipo y una lista de bloques siguientes (D-19). Un bloque sin siguientes es un final. La aventura tiene un bloque inicial.

**H9 — Bloque de pruebas.** Como DM quiero un bloque de pruebas de habilidad o salvaciones, o un bloque de deducción y lógica.
- Criterio, campos comunes: nombre, descripción del escenario y los sucesos, pistas, consecuencias y recompensas.
- Pruebas de habilidad o salvación: una lista de pruebas, cada una con su habilidad o característica y su CD.
- Deducción: la respuesta esperada (texto que ve solo el DM).

**H10 — Bloque de combate.** Como DM quiero elegir enemigos de una lista de monstruos y NPC, marcar algunos como opcionales, y escribir el escenario, los sucesos y la recompensa.
- Criterio: al activar el bloque se crea un combate normal con los enemigos no opcionales; los opcionales aparecen como sugerencia en "agregar participante" (D-18).

**H11 — Aventura pendiente.** Como DM quiero dejar la aventura lista y esperar a que se sumen los jugadores desde su panel.
- Criterio: el jugador ve la aventura pendiente en su campaña y toca "Estoy presente"; el DM ve la lista de presentes, con hasta ~10 s de demora (D-13), y la activa cuando quiere.

**H2 (parte B) — Aventura del día.** Como jugador quiero un link a la aventura activa de mi campaña.
- Criterio: el jugador ve el título y la descripción del bloque actual (sin la respuesta ni las CD), y su ficha. Se actualiza cada ~10 s.

**H12 — Conducir la aventura.** Como DM quiero manejar el bloque actual y avanzar al siguiente.
- Criterio: un botón para avanzar; si el bloque tiene más de un siguiente, el DM elige cuál. Queda un historial de los bloques recorridos.

**H13 — Elegir quién tira.** Como DM quiero elegir qué personaje hace la tirada o da la respuesta del grupo.
- Criterio: el DM elige el personaje y la prueba, escribe el resultado (D-14), y la app muestra el bono que le corresponde y si supera la CD. El intento queda guardado en el historial del bloque. En deducción, el DM marca si la respuesta fue correcta y puede revelar pistas.

**H15 — Fatiga por salvación.** Como DM quiero pedir en cualquier momento una salvación de CON que, si falla, da un nivel de agotamiento.
- Criterio: el DM elige los personajes y la CD y escribe cada resultado; quien falla sube un nivel de agotamiento; queda registrado en la aventura.

### Fase C — Catálogos de hechizos, armas y armaduras

**H17 — Hechizos.** Como DM quiero ver los hechizos globales disponibles y crear hechizos nuevos para mi campaña.
- Criterio:
  - Catálogo global de solo lectura, niveles 0–4 (D-12), con nombre, nivel, escuela, tiempo de lanzamiento, alcance, componentes, duración, concentración, clases que lo tienen y descripción breve.
  - El DM crea hechizos propios en su campaña o clona uno global para modificarlo.
  - El DM asigna hechizos a un personaje; la ficha los muestra por nivel.
  - Espacios de conjuro calculados desde la tabla según clase y nivel (§6.1).
  - Acciones guardadas de tipo hechizo (D-16).
- **Armas:** mismo patrón. Catálogo global con nombre, categoría (sencilla o marcial, cuerpo a cuerpo o a distancia), daño y tipo, propiedades y maestría **[verificar]**. El DM asigna armas a un personaje; cada arma genera su acción de ataque con el bono calculado (`p2-reglas-personaje.md` §2.5).

### Fase D — Progresión

**H14 — El DM da una subida de nivel.** Desde la sección de personajes de la campaña.
- Criterio: el DM sube el nivel de un personaje (tope 7); la competencia, los espacios y los dados de golpe se recalculan solos. Si el nuevo nivel da una mejora de característica, queda pendiente para el jugador.

**H5 — El jugador reparte sus puntos.** Cuando tiene una mejora pendiente.
- Criterio: +2 a una característica o +1 a dos, con un máximo de 20 en cada una **[verificar]**; o una dote del catálogo, si se acuerda incluirlas. Una vez confirmado, no se puede deshacer desde la pantalla del jugador.
- Niveles con mejora dentro del tope: 4 para todas las clases; 6 adicional para Guerrero **[verificar]**.

---

## 5. Cambios de esquema previstos (resumen, no definitivo)

| Fase | Cambio |
|---|---|
| A | `CharacterTemplate`: `class`, `subclass`, datos físicos, `backstory`, `armorName`, `silver`, `hitDiceUsed`; eliminar o dejar sin uso la columna `proficiencyBonus` (T11); recarga de recursos generalizada (`catalogo-recursos-clase.md` §2.1); tabla de rasgos del personaje |
| B | `Adventure`, `AdventureBlock` (con siguientes), `AdventureCheck` (pruebas del bloque), `AdventureAttempt` (intentos y resultados), presentes de la aventura, enlace bloque ↔ combate |
| C | `Spell`, `Weapon` y `Armor` (globales + de campaña), asignación al personaje, `TemplateAction` de tipo hechizo |
| D | Mejora de característica pendiente por personaje e historial de subidas |

Cada migración se aplica primero en la base de desarrollo, se verifica, y recién después en producción.

---

## 6. Investigación (la hace Gonzalo)

### 6.1 Espacios de conjuro hasta nivel 7

El patrón que se espera encontrar (**[verificar]** contra el PHB 2024):

| Nivel | Lanzador completo (Bardo, Clérigo, Druida, Hechicero, Mago) | Medio lanzador (Paladín, Explorador) | Brujo (pacto) |
|---|---|---|---|
| 1 | 2 de nivel 1 | 2 de nivel 1 | 1 espacio de nivel 1 |
| 2 | 3 | 2 | 2 de nivel 1 |
| 3 | 4 · 2 | 3 | 2 de nivel 2 |
| 4 | 4 · 3 | 3 | 2 de nivel 2 |
| 5 | 4 · 3 · 2 | 4 · 2 | 2 de nivel 3 |
| 6 | 4 · 3 · 3 | 4 · 2 | 2 de nivel 3 |
| 7 | 4 · 3 · 3 · 1 | 4 · 3 | 2 de nivel 4 |

Patrón: **un medio lanzador de nivel N tiene los espacios de un lanzador completo de nivel ⌈N/2⌉.** Si se confirma, alcanza con una tabla y una regla.

Las subclases lanzadoras de Guerrero y Pícaro (un tercio de lanzador desde nivel 3) quedan afuera, salvo que se acuerde sumarlas.

### 6.2 Hechizos más usados por clase y nivel (0–4)

Sirve para decidir qué entra al catálogo global. Recomendación de forma de entrega: una planilla con nombre, nivel, clases y fuente. Si sale del SRD 5.2 hay que confirmar la licencia (D-7).

### 6.3 Armas y armaduras

Listas cerradas y chicas, sin escalado por nivel. Gonzalo arma la selección básica (§7.5).
- Armas: categoría, daño y tipo, propiedades y maestría de 2024 **[verificar]**.
- Armaduras: tipo (ligera, media, pesada, escudo), CA base, tope de DES, requisito de FUE y desventaja en Sigilo **[verificar]**.

---

## 7. Decisiones de seguimiento (cerradas el 2026-11-23)

| ID | Pregunta | Decisión de Gonzalo |
|---|---|---|
| 7.1 | El tope de nivel 7, ¿aplica también a NPC y monstruos? Hoy hay monstruos y NPC de nivel 10 a 20 en las dos bases **[DB]** | **Solo a jugadores (`PLAYER`).** En monstruos y NPC el nivel sigue libre |
| 7.2 | En producción hay **2 personajes de jugador de nivel 8** **[DB]** | **Se dejan como están** hasta que Gonzalo revise de quiénes son. Probablemente se bajen a 7, con un script acotado a sus IDs y confirmación en el momento. Mientras tanto, la validación del tope no debe romper la edición de esos dos personajes |
| 7.3 | Dotes | **Texto libre** en los rasgos del personaje (fase A). Sin catálogo de dotes; en la fase D la mejora es solo de características |
| 7.4 | CA | **El DM escribe la CA base** en la fase A. Calcularla se evalúa cuando exista el catálogo de armaduras |
| 7.5 | Contenido de los catálogos | **Gonzalo arma la lista básica de armas, hechizos y armaduras** y se suma cuando esté lista. La fase C incluye las armaduras como tercer catálogo, con el mismo patrón (D-20) |

---

## 8. Cambios acordados después de este documento

_Vacío. Cada diferencia que se negocie durante el trabajo se anota acá con fecha, qué cambió y por qué._
