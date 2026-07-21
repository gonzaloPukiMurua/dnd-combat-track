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

export function GroupListFilter({ groups }: { groups: Group[] }) {
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
          placeholder="Search groups by name…"
          className="w-full h-10 px-3 rounded-xl border-2 border-slate-100 text-sm focus:outline-none focus:border-slate-300"
        />
      )}

      {groups.length === 0 && (
        <div className="text-center py-12 text-slate-400 space-y-2">
          <p className="text-4xl">👥</p>
          <p className="font-medium">No groups yet</p>
          <p className="text-sm">Save your party or a common encounter for quick combat setup.</p>
        </div>
      )}

      {groups.length > 0 && filtered.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">
          No groups match your search.
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}
      </div>
    </div>
  );
}