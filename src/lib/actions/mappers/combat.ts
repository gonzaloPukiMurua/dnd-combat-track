import type { getCombatDetail } from "@/lib/actions/queries/combat";
import type {
  Participant, LogEntry, CombatStatus, TemplateActionView, ActionKind, ActionEconomy,
} from "@/domain/combat/types";

type CombatDetail = NonNullable<Awaited<ReturnType<typeof getCombatDetail>>>;

// Shape of a raw Prisma TemplateAction row as it rides along on either side
// of the include (queries/combat.ts) — stated explicitly rather than derived
// via conditional types, since both template.actions and
// monsterTemplate.actions resolve to the same row shape.
type RawAction = {
  id:          string;
  name:        string;
  kind:        string;
  attackBonus: number | null;
  formula:     string;
  damageType:  string | null;
  uses:        number;
  economyType: string;
};

function mapAction(a: RawAction): TemplateActionView {
  return {
    id:          a.id,
    name:        a.name,
    kind:        a.kind as ActionKind,
    attackBonus: a.attackBonus,
    formula:     a.formula,
    damageType:  a.damageType,
    uses:        a.uses,
    economyType: a.economyType as ActionEconomy,
  };
}

export type MappedCombat = {
  id:               string;
  name:             string;
  status:           CombatStatus;
  round:            number;
  currentTurnIndex: number;
  participants:     Participant[];
  logs:             LogEntry[];
};

// Prisma → domain. Single place that shapes a raw combat query result into
// what the store / view components expect.
export function mapCombatDetail(combat: CombatDetail): MappedCombat {
  return {
    id:               combat.id,
    name:             combat.name,
    status:           combat.status as CombatStatus,
    round:            combat.round,
    currentTurnIndex: combat.currentTurnIndex,
    participants: combat.participants.map((p) => ({
      id:                 p.id,
      combatId:           p.combatId,
      templateId:         p.templateId,
      displayName:        p.displayName,
      initiative:         p.initiative,
      turnOrder:          p.turnOrder,
      maxHp:              p.maxHp,
      currentHp:          p.currentHp,
      tempHp:             p.tempHp,
      baseAc:             p.baseAc,
      acModifiers:        p.acModifiers as never,
      conditions:         p.conditions  as never,
      isConscious:        p.isConscious,
      isStabilized:       p.isStabilized,
      deathSaveSuccesses: p.deathSaveSuccesses,
      deathSaveFailures:  p.deathSaveFailures,
      actionUsed:         p.actionUsed,
      bonusUsed:          p.bonusUsed,
      reactionUsed:       p.reactionUsed,
      level:              p.level,
      proficiencyBonus:   p.proficiencyBonus,
      str:                p.str,
      dex:                p.dex,
      con:                p.con,
      int:                p.int,
      wis:                p.wis,
      cha:                p.cha,
      speed:              p.speed,
      hitDice:            p.hitDice,
      // A global-roster participant has no CharacterTemplate (p.template null,
      // etapa-3-monstruos.md §5). Surface a synthetic view-model template with
      // type "MONSTER" from the MonsterTemplate so the border-color selector
      // (TYPE_ACCENT) and the initiative tie-break work without a null check at
      // every use site. `templateId` stays null — that's the real monster flag.
      template: p.template ? {
        id:              p.template.id,
        name:            p.template.name,
        type:            p.template.type,
        maxHp:           p.template.maxHp,
        baseAc:          p.template.baseAc,
        initiativeBonus: p.template.initiativeBonus,
        actions:         p.template.actions.map(mapAction),
      } : p.monsterTemplate ? {
        id:              p.monsterTemplate.id,
        name:            p.monsterTemplate.name,
        type:            "MONSTER",
        maxHp:           p.monsterTemplate.maxHp,
        baseAc:          p.monsterTemplate.baseAc,
        initiativeBonus: p.monsterTemplate.initiativeBonus,
        actions:         p.monsterTemplate.actions.map(mapAction),
      } : null,
    })),
    logs: combat.logs.map((l) => ({
      id:        l.id,
      combatId:  l.combatId,
      round:     l.round,
      type:      l.type as LogEntry["type"],
      actorId:   l.actorId,
      targetId:  l.targetId,
      amount:    l.amount,
      note:      l.note,
      createdAt: l.createdAt,
      actor:     l.actor  ? { displayName: l.actor.displayName  } : null,
      target:    l.target ? { displayName: l.target.displayName } : null,
    })),
  };
}
