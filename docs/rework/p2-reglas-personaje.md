# P2 — Reglas de personaje (D&D 2024)

> Estado: **APROBADO** por Gonzalo (2026-10-04), con decisiones D-8 a D-11 tomadas. Pendiente solo verificar contra el libro las marcas [verificar] de subidas de nivel y pericia.
> Alcance: el cálculo puro del personaje (`src/domain/character/`). No incluye pantallas ni clases completas.
> Etiquetas: **[regla]** = mecánica del libro, · **[verificar]** = tomada de fuentes secundarias, confirmar contra el PHB 2024 · **[decidir]** = decisión de producto pendiente.

## 1. Qué calcula el dominio (funciones puras)

| Función | Entrada | Salida |
|---|---|---|
| `abilityModifier(score)` | puntuación 1–30 | modificador |
| `proficiencyBonus(level)` | nivel 1–20 | bono de competencia |
| `savingThrowBonus(...)` | puntuación, competencia en salvación, bono | bono de salvación |
| `skillBonus(...)` | característica de la habilidad, competencia, pericia, bono | bono de habilidad |
| `passiveScore(skillBonus)` | bono de habilidad | 10 + bono |
| `spellSaveDc(...)` / `spellAttackBonus(...)` | característica de conjuro, bono | CD / bono de ataque |
| `exhaustionEffects(level)` | 0–6 | penalización a pruebas de d20 y velocidad, o muerte |

Todas van en `domain/character/` con tests de `node:test`, mismo patrón que `rules.test.ts`.

## 2. Reglas

### 2.1 Modificador de característica  **[regla]**
`modificador = floor((puntuación − 10) / 2)`. Con puntuación 1 → −5; 30 → +10.

### 2.2 Bono de competencia  **[regla]**
| Nivel | Bono |
|---|---|
| 1–4 | +2 |
| 5–8 | +3 |
| 9–12 | +4 |
| 13–16 | +5 |
| 17–20 | +6 |

Decidido (D-5): se deriva del nivel; no se edita a mano.

### 2.3 Salvaciones  **[regla]**
`salvación = modificador de característica + (competente ? bono de competencia : 0)`.
Cada personaje tiene competencia en dos salvaciones según su clase. **[decidir]** en v1 se marcan a mano, porque las clases no están modeladas.

### 2.4 Habilidades  **[regla]**
18 habilidades, cada una ligada a una característica:

| Característica | Habilidades |
|---|---|
| Fuerza | Atletismo |
| Destreza | Acrobacias, Juego de manos, Sigilo |
| Constitución | — |
| Inteligencia | Arcanos, Historia, Investigación, Naturaleza, Religión |
| Sabiduría | Trato con animales, Perspicacia, Medicina, Percepción, Supervivencia |
| Carisma | Engaño, Intimidación, Interpretación, Persuasión |

`bono de habilidad = modificador + (competente ? bono : 0) + (pericia ? bono : 0)`.
Pericia = el bono se suma dos veces. **[verificar]** Confirmar el nombre y los requisitos de pericia de clases en el PHB 2024; en v1 solo se modela el campo.
Puntuación pasiva = 10 + bono de habilidad (Percepción, Perspicacia, Investigación). **[regla]**

### 2.5 Ataques y conjuros  **[regla]**
- Bono de ataque con arma = modificador de característica (Fuerza, o Destreza si es acabada) + bono de competencia si está competente con el arma.
- CD de conjuro = 8 + bono de competencia + modificador de la característica de lanzamiento.
- Bono de ataque de conjuro = bono de competencia + modificador de la característica de lanzamiento.

**[decidir]** La app no tira ataques: el DM tira el d20 y lo escribe. Entonces estos valores se muestran como referencia, no se aplican solos.

### 2.6 Iniciativa  **[regla]**
Modificador de Destreza. La app ya lo tiene como `initiativeBonus` en la plantilla; se mantiene.

### 2.7 Agotamiento  **[verificar]**
Según fuentes secundarias del PHB 2024 (confirmar):
- Cada nivel resta **2 × nivel** a todas las pruebas de d20 (característica, ataque, salvación). *Confirmado por Gonzalo.*
- Cada nivel resta **5 pies × nivel** a la velocidad.
- Nivel 6 = muerte.
- Un descanso largo quita **un** nivel.

**[decidir]** Como la app no tira dados, el efecto se muestra como penalización informativa en la ficha; no modifica ningún número automáticamente.

### 2.8 Subida de nivel  **[verificar]**
Mejoras de característica en niveles 4, 8, 12, 16 y 19 (+2 a una característica, o +1 a dos, o una dote). **[decidir]** La subida la hace el DM (U2 de la lista); la app no decide reglas de XP.

## 3. Lo que queda fuera de v1
- Clases, subclases y listas de conjuros completas (contenido de P4).
- Espacios de conjuro por clase y nivel: en v1 se cargan a mano (**[decidir]**).
- Dotes y rasgos (P5).
- Tiradas automáticas (la app no tira dados para el DM).

## 4. Decisiones (tomadas por Gonzalo, 2026-10-04)

| ID | Pregunta | Recomendación |
|---|---|---|
| D-8 | ¿Las salvaciones y habilidades con competencia se marcan a mano en v1? | **Sí.** Se automatiza con clases más adelante. |
| D-9 | ¿Los espacios de conjuro se cargan a mano en v1? | **Sí, por ahora.** |
| D-10 | ¿El agotamiento se muestra como penalización informativa? | **Sí, por ahora solo informativa.** |
| D-11 | ¿Los valores de ataque y CD son solo referencia? | **Sí, por ahora.** |

## 5. Criterio de salida de P2
- Funciones de la sección 1 implementadas y con tests (`npm test`).
- Ficha de jugador muestra todos los valores de la sección 2 a partir de los datos del personaje.
- Estado persistente entre combates (D-2): HP, condiciones, agotamiento, ranuras y recursos de clase se guardan al cerrar el combate.
- Verificado en vivo contra la base de desarrollo, nunca contra producción.
