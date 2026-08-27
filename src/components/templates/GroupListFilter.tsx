"use client";

import { useMemo, useState } from "react";
import { GroupCard } from "@/components/groups/GroupCard";

type Member = {
  id:       string;
  quantity: number;
  template: {
    name:    string;
    type:    string;
    maxHp:   number;
    baseAc:  number;
  };
};

type Group = {
  id:          string;
  name:        string;
  description: string | null;
  members:     Member[];
};

export function GroupListFilter({ groups, campaignId }: { groups: Group[]; campaignId: string }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, query]);

  return (
    <div className="space-y-4">
      {groups.length > 0 && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar grupos por nombre…"
          className="w-full h-10 px-3 rounded-gothic-sm bg-gothic-surface-low ring-1 ring-gothic-outline-variant text-sm text-gothic-on-surface outline-none placeholder:text-gothic-outline transition-all focus:bg-gothic-surface focus:ring-gothic-primary"
        />
      )}

      {groups.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-gothic-on-surface-variant text-center py-8">
          Ningún grupo coincide con la búsqueda.
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((g) => (
          <GroupCard key={g.id} group={g} campaignId={campaignId} />
        ))}
      </div>
    </div>
  );
}
