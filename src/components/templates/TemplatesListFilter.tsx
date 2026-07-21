"use client";

import { useMemo, useState } from "react";
import { CharacterType } from "@prisma/client";
import { TemplateCard } from "@/components/templates/TemplateCard";

type Template = {
  id:              string;
  name:            string;
  type:            CharacterType;
  maxHp:           number;
  baseAc:          number;
  initiativeBonus: number;
};

type TypeFilter = "ALL" | CharacterType;

const TYPE_TABS: { value: TypeFilter; label: string }[] = [
  { value: "ALL",     label: "All" },
  { value: "PLAYER",  label: "Players" },
  { value: "NPC",     label: "NPCs" },
  { value: "MONSTER", label: "Monsters" },
];

const SECTION_LABELS: Record<CharacterType, string> = {
  PLAYER:  "Players",
  NPC:     "NPCs",
  MONSTER: "Monsters",
};

export function TemplateListFilter({ templates }: { templates: Template[] }) {
  const [query, setQuery]   = useState("");
  const [type, setType]     = useState<TypeFilter>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      const matchesType  = type === "ALL" || t.type === type;
      const matchesQuery = q === "" || t.name.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [templates, query, type]);

  const sections: CharacterType[] = ["PLAYER", "NPC", "MONSTER"];

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates by name…"
          className="w-full h-10 px-3 rounded-xl border-2 border-slate-100 text-sm focus:outline-none focus:border-slate-300"
        />

        <div className="flex gap-2 flex-wrap">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setType(tab.value)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                type === tab.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty states */}
      {templates.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">
          No templates yet. Create your first one above.
        </p>
      )}

      {templates.length > 0 && filtered.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">
          No templates match your search.
        </p>
      )}

      {/* Sections */}
      {sections.map((sectionType) => {
        const items = filtered.filter((t) => t.type === sectionType);
        if (items.length === 0) return null;

        return (
          <section key={sectionType} className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {SECTION_LABELS[sectionType]}
            </h2>
            {items.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </section>
        );
      })}
    </div>
  );
}