import { getGroups } from "@/lib/actions/groups";
import { GroupCard } from "@/components/groups/GroupCard";
import Link from "next/link";

export default async function GroupsPage() {
  const groups = await getGroups();

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Groups</h1>
        <Link
          href="/groups/new"
          className="bg-slate-900 text-white rounded-xl px-4 h-10 flex items-center text-sm font-semibold hover:bg-slate-800 transition-colors"
        >
          + New group
        </Link>
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12 text-slate-400 space-y-2">
          <p className="text-4xl">👥</p>
          <p className="font-medium">No groups yet</p>
          <p className="text-sm">Save your party or a common encounter for quick combat setup.</p>
        </div>
      )}

      <div className="space-y-3">
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}
      </div>
    </div>
  );
}