"use client";

import { deleteTemplate } from "@/lib/actions/templates";
import { CharacterType } from "@prisma/client";

type Template = {
  id:              string;
  name:            string;
  type:            CharacterType;
  maxHp:           number;
  baseAc:          number;
  initiativeBonus: number;
};

const TYPE_LABELS: Record<CharacterType, string> = {
  PLAYER:  "Player",
  NPC:     "NPC",
  MONSTER: "Monster",
};

const TYPE_COLORS: Record<CharacterType, string> = {
  PLAYER:  "bg-blue-100 text-blue-700",
  NPC:     "bg-green-100 text-green-700",
  MONSTER: "bg-red-100 text-red-700",
};

export function TemplateCard({ template }: { template: Template }) {
  const bonus = template.initiativeBonus >= 0
    ? `+${template.initiativeBonus}`
    : `${template.initiativeBonus}`;

  return (
    <div className="border rounded p-3 flex items-center justify-between bg-white">

      {/* Left: name + type badge */}
      <div className="flex items-center gap-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[template.type]}`}>
          {TYPE_LABELS[template.type]}
        </span>
        <span className="font-medium">{template.name}</span>
      </div>

      {/* Middle: stats */}
      <div className="flex gap-4 text-sm text-gray-500">
        <span>HP <strong className="text-gray-800">{template.maxHp}</strong></span>
        <span>AC <strong className="text-gray-800">{template.baseAc}</strong></span>
        <span>Init <strong className="text-gray-800">{bonus}</strong></span>
      </div>

      {/* Right: delete */}
      <form action={async () => { await deleteTemplate(template.id); }}>
        <button
          type="submit"
          className="text-gray-400 hover:text-red-500 text-sm transition-colors"
          aria-label={`Delete ${template.name}`}
        >
          ✕
        </button>
      </form>

    </div>
  );
}