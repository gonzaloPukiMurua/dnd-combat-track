export type AcModifier = { source: string; value: number };
export type Condition  = { name: string };

export type ActionKind    = "ATTACK" | "HEAL";
export type ActionEconomy = "ACTION" | "BONUS_ACTION" | "REACTION";

// Read-only view of a TemplateAction as surfaced on a combat participant
// (etapa-3-acciones-tiradas.md §2/§4b) — read live from the origin template,
// never snapshotted onto CombatParticipant.
export type TemplateActionView = {
  id:          string;
  name:        string;
  kind:        ActionKind;
  attackBonus: number | null;
  formula:     string;
  damageType:  string | null;
  uses:        number;
  economyType: ActionEconomy;
};

export type Participant = {
  id:                 string;
  combatId:           string;
  templateId:         string | null;
  displayName:        string;
  initiative:         number;
  turnOrder:          number;
  maxHp:              number;
  currentHp:          number;
  tempHp:             number;
  baseAc:             number;
  acModifiers:        AcModifier[];
  conditions:         Condition[];
  isConscious:        boolean;
  isStabilized:       boolean;
  deathSaveSuccesses: number;
  deathSaveFailures:  number;
  actionUsed:         boolean;
  bonusUsed:          boolean;
  reactionUsed:       boolean;
  // D10 — ficha de combatiente (stat cards). Read-only display data, not
  // used by any mutation.
  level:              number;
  proficiencyBonus:   number;
  str:                number;
  dex:                number;
  con:                number;
  int:                number;
  wis:                number;
  cha:                number;
  speed:              number;
  hitDice:            string | null;
  template: {
    id:              string;
    name:            string;
    type:            string;
    maxHp:           number;
    baseAc:          number;
    initiativeBonus: number;
    actions:         TemplateActionView[];
  } | null;
};

// Slim projection of Participant used by target selectors / summaries.
// Carries baseAc/acModifiers (not just displayName/HP) because the guided
// attack flow (etapa-3-acciones-tiradas.md §4) needs a target's AC total to
// resolve impact, and this is the only participant list threaded down to
// CombatRow's target picker.
export type ParticipantSummary = {
  id: string; displayName: string; isConscious: boolean;
  currentHp: number; maxHp: number; tempHp: number;
  baseAc: number; acModifiers: AcModifier[];
};

export type LogEntry = {
  id:        string;
  combatId:  string;
  round:     number;
  type:      "DAMAGE" | "HEAL" | "CONDITION_ADDED" | "CONDITION_REMOVED" | "NOTE";
  actorId:   string | null;
  targetId:  string | null;
  amount:    number | null;
  note:      string | null;
  createdAt: Date;
  actor:     { displayName: string } | null;
  target:    { displayName: string } | null;
};

export type CombatStatus = "SETUP" | "ACTIVE" | "FINISHED";
