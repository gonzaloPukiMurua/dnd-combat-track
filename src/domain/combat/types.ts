export type AcModifier = { source: string; value: number };
export type Condition  = { name: string };

export type Participant = {
  id:                 string;
  combatId:           string;
  templateId:         string;
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
  template: {
    id:              string;
    name:            string;
    type:            string;
    maxHp:           number;
    baseAc:          number;
    initiativeBonus: number;
  };
};

// Slim projection of Participant used by target selectors / summaries.
export type ParticipantSummary = {
  id: string; displayName: string; isConscious: boolean;
  currentHp: number; maxHp: number; tempHp: number;
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
