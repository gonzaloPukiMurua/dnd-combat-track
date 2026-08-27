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
  { value: "ALL",     label: "Todos" },
  { value: "PLAYER",  label: "Jugadores" },
  { value: "NPC",     label: "PNJs" },
  { value: "MONSTER", label: "Monstruos" },
];

const SECTION_LABELS: Record<CharacterType, string> = {
  PLAYER:  "Jugadores",
  NPC:     "PNJs",
  MONSTER: "Monstruos",
};

export function TemplateListFilter({ templates, campaignId }: { templates: Template[]; campaignId: string }) {
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
          placeholder="Buscar personajes por nombre…"
          className="w-full h-10 px-3 rounded-gothic-sm bg-gothic-surface-low ring-1 ring-gothic-outline-variant text-sm text-gothic-on-surface outline-none placeholder:text-gothic-outline transition-all focus:bg-gothic-surface focus:ring-gothic-primary"
        />

        <div className="flex gap-2 flex-wrap">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setType(tab.value)}
              className={`text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-gothic-sm transition-colors ${
                type === tab.value
                  ? "bg-gothic-primary text-gothic-on-primary"
                  : "bg-gothic-surface-high text-gothic-on-surface-variant hover:bg-gothic-surface ring-1 ring-gothic-outline-variant"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty states */}
      {templates.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-gothic-on-surface-variant text-center py-8">
          Ningún personaje coincide con la búsqueda.
        </p>
      )}

      {/* Sections */}
      {sections.map((sectionType) => {
        const items = filtered.filter((t) => t.type === sectionType);
        if (items.length === 0) return null;

        return (
          <section key={sectionType} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gothic-on-surface-variant">
              {SECTION_LABELS[sectionType]}
            </h2>
            {items.map((t) => (
              <TemplateCard key={t.id} template={t} campaignId={campaignId} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
