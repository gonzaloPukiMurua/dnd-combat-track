// Pure dice-notation evaluator — no React, no Prisma, nothing from domain/combat.
// Just grammar parsing + arithmetic over an injectable RNG. Same separation
// criterion as domain/combat/: this is a standalone package (see
// docs/etapa-3/spec-tecnico-etapa-3-acciones-tiradas.md §3).

export interface RollResult {
  /** Sum of every die plus the fixed modifier. Can be negative (e.g. "1d4-5"). */
  total: number;
  /** One entry per die rolled, in order, each already in [1, M]. */
  rolls: number[];
  /** The fixed +K/-K modifier; 0 when the formula has none. */
  modifier: number;
}

/** Returns a float in [0, 1), same contract as Math.random. */
export type Rng = () => number;

/** Die sizes the app supports everywhere else (startCombat's initiative uses d20). */
export const SUPPORTED_DIE_FACES = [4, 6, 8, 10, 12, 20, 100] as const;
type SupportedFaces = (typeof SUPPORTED_DIE_FACES)[number];

// Grammar: NdM[+K|-K] — N >= 1, M in SUPPORTED_DIE_FACES, K an optional signed int.
// Deliberately out of scope: mixed dice ("1d8+1d6"), keep-highest/lowest ("2d20kh1").
// Anything that doesn't match this throws rather than being guessed at.
const FORMULA_PATTERN = /^(\d+)d(\d+)([+-]\d+)?$/;

function invalid(formula: string, reason: string): never {
  throw new Error(
    `Fórmula de dados inválida: ${JSON.stringify(formula)} — ${reason}. ` +
      `Formato esperado: NdM o NdM±K (ej. "1d8", "2d6+3", "1d4-1"), ` +
      `con M en {${SUPPORTED_DIE_FACES.join(", ")}}.`
  );
}

function isSupportedFaces(faces: number): faces is SupportedFaces {
  return (SUPPORTED_DIE_FACES as readonly number[]).includes(faces);
}

export function rollFormula(formula: string, rng: Rng = Math.random): RollResult {
  if (typeof formula !== "string" || formula.trim() === "") {
    invalid(formula, "la fórmula está vacía");
  }

  const match = FORMULA_PATTERN.exec(formula.trim());
  if (!match) {
    invalid(formula, "no coincide con la gramática NdM[±K]");
  }

  const count = Number(match[1]);
  const faces = Number(match[2]);
  const modifier = match[3] === undefined ? 0 : Number(match[3]);

  if (count < 1) {
    invalid(formula, "la cantidad de dados (N) debe ser un entero >= 1");
  }
  if (!isSupportedFaces(faces)) {
    invalid(formula, `el dado d${faces} no está soportado`);
  }

  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(faces, rng));
  }

  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
  return { total, rolls, modifier };
}

function rollDie(faces: number, rng: Rng): number {
  return Math.floor(rng() * faces) + 1;
}
