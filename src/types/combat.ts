export type ParticipantSummary = {
  id: string; displayName: string; isConscious: boolean;
  currentHp: number; maxHp: number; tempHp: number;
};

export type TemplateSummary = {
  id:     string;
  name:   string;
  type:   string;
  maxHp:  number;
  baseAc: number;
};