export type TemplateSummary = {
  id:     string;
  name:   string;
  type:   string;
  maxHp:  number;
  baseAc: number;
};

// Global monster roster entry (etapa-3-monstruos.md §5) — no campaign, no
// ability scores; `category` groups the combat-entry picker.
export type MonsterSummary = {
  id:       string;
  name:     string;
  category: string | null;
  maxHp:    number;
  baseAc:   number;
};
