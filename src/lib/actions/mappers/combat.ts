import type { getCombatDetail } from "@/lib/actions/queries/combat";
import type { Participant, LogEntry, CombatStatus } from "@/domain/combat/types";

type CombatDetail = NonNullable<Awaited<ReturnType<typeof getCombatDetail>>>;

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
      template: {
        id:              p.template.id,
        name:            p.template.name,
        type:            p.template.type,
        maxHp:           p.template.maxHp,
        baseAc:          p.template.baseAc,
        initiativeBonus: p.template.initiativeBonus,
      },
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
