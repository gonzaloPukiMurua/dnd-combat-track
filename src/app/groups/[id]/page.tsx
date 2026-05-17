import { notFound } from "next/navigation";
import { getGroupById } from "@/lib/actions/groups";
import { getTemplates } from "@/lib/actions/templates";
import { addGroupMember, removeGroupMember } from "@/lib/actions/groups";
import Link from "next/link";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [group, templates] = await Promise.all([
    getGroupById(id),
    getTemplates(),
  ]);

  if (!group) notFound();

  const memberTemplateIds = group.members.map((m) => m.templateId);
  const availableTemplates = templates.filter(
    (t) => !memberTemplateIds.includes(t.id)
  );

  return (
    <div className="py-6 space-y-6 max-w-lg">
      <div>
        <a href="/groups" className="text-sm text-slate-400 hover:text-slate-600">
          ← Back to groups
        </a>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{group.name}</h1>
        {group.description && (
          <p className="text-slate-400 text-sm mt-0.5">{group.description}</p>
        )}
      </div>

      {/* Current members */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Members ({group.members.length})
        </h2>

        {group.members.length === 0 && (
          <p className="text-slate-400 text-sm py-4 text-center">
            No members yet. Add templates below.
          </p>
        )}

        {group.members.map((m) => (
          <div key={m.id}
            className="flex items-center gap-3 bg-white border-2 border-slate-100 rounded-2xl px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 truncate">{m.template.name}</p>
              <p className="text-xs text-slate-400">
                HP {m.template.maxHp} · AC {m.template.baseAc}
                {m.quantity > 1 && ` · ×${m.quantity}`}
              </p>
            </div>
            <form action={async () => {
              "use server";
              await removeGroupMember(m.id, group.id);
            }}>
              <button type="submit"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                ✕
              </button>
            </form>
          </div>
        ))}
      </section>

      {/* Add member */}
      {availableTemplates.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Add template
          </h2>
          <form action={addGroupMember}
            className="bg-white border-2 border-slate-100 rounded-2xl p-4 space-y-3">
            <input type="hidden" name="groupId" value={group.id} />
            <div className="flex gap-2">
              <select name="templateId"
                className="flex-1 border-2 border-slate-200 rounded-xl px-3 h-11 text-sm focus:outline-none focus:border-blue-500">
                {availableTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — HP {t.maxHp} AC {t.baseAc}
                  </option>
                ))}
              </select>
              <input name="quantity" type="number" min={1} max={20} defaultValue={1}
                className="w-16 border-2 border-slate-200 rounded-xl px-2 h-11 text-center text-base focus:outline-none focus:border-blue-500" />
              <button type="submit"
                className="bg-slate-900 text-white rounded-xl px-4 h-11 text-sm font-semibold hover:bg-slate-800 transition-colors">
                Add
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Start combat with this group */}
      {group.members.length > 0 && (
        <Link
          href={`/combat?groupId=${group.id}`}
          className="w-full h-12 bg-green-600 text-white rounded-2xl font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center"
        >
          Start combat with this group →
        </Link>
      )}
    </div>
  );
}