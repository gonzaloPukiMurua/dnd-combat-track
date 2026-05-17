import { notFound, redirect } from "next/navigation";
import { getTemplateById, updateTemplate } from "@/lib/actions/templates";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplateById(id);

  if (!template) notFound();

  const bonus = template.initiativeBonus >= 0
    ? `+${template.initiativeBonus}`
    : `${template.initiativeBonus}`;

  const inputCls = "w-full border-2 border-slate-200 rounded-xl px-3 h-12 text-base focus:outline-none focus:border-blue-500 transition-colors bg-white";
  const labelCls = "text-sm font-medium text-slate-600";

  return (
    <div className="py-6 space-y-6 max-w-lg">

      {/* Header */}
      <div className="space-y-1">
        <a
          href="/templates"
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          ← Back to templates
        </a>
        <h1 className="text-2xl font-bold text-slate-900">
          Edit template
        </h1>
        <p className="text-sm text-slate-400">
          Changes apply to future combats. Active combat snapshots are not affected.
        </p>
      </div>

      {/* Form */}
      <form
        action={async (formData: FormData) => {
          "use server";
          const result = await updateTemplate(undefined as never, formData);
          if (result.success) redirect("/templates");
        }}
        className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm"
      >
        {/* Hidden ID */}
        <input type="hidden" name="id" value={template.id} />

        {/* Type — read only */}
        <div className="space-y-1.5">
          <p className={labelCls}>Type</p>
          <div className="flex items-center gap-2 h-12 px-3 border-2 border-slate-100 rounded-xl bg-slate-50">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              template.type === "PLAYER"  ? "bg-indigo-100 text-indigo-700" :
              template.type === "NPC"     ? "bg-emerald-100 text-emerald-700" :
                                           "bg-red-100 text-red-700"
            }`}>
              {template.type}
            </span>
            <span className="text-sm text-slate-400">
              Type cannot be changed after creation
            </span>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className={labelCls}>Name</label>
          <input
            id="name"
            name="name"
            defaultValue={template.name}
            required
            className={inputCls}
          />
        </div>

        {/* Max HP + Base AC */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="maxHp" className={labelCls}>Max HP</label>
            <input
              id="maxHp"
              name="maxHp"
              type="number"
              min={1}
              defaultValue={template.maxHp}
              required
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="baseAc" className={labelCls}>Armor Class</label>
            <input
              id="baseAc"
              name="baseAc"
              type="number"
              min={1}
              defaultValue={template.baseAc}
              required
              className={inputCls}
            />
          </div>
        </div>

        {/* Initiative bonus */}
        <div className="space-y-1.5">
          <label htmlFor="initiativeBonus" className={labelCls}>
            Initiative bonus
            <span className="ml-2 text-slate-400 font-normal">
              (current: {bonus})
            </span>
          </label>
          <input
            id="initiativeBonus"
            name="initiativeBonus"
            type="number"
            defaultValue={template.initiativeBonus}
            className={inputCls}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <a
            href="/templates"
            className="flex-1 h-12 flex items-center justify-center border-2 border-slate-200 rounded-xl text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="flex-1 h-12 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
