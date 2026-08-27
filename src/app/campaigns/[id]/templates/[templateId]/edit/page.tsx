import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTemplateById, updateTemplate } from "@/lib/actions/templates";
import { requireCampaignDm } from "@/lib/auth/guards";

const TYPE_LABELS: Record<string, string> = {
  PLAYER:  "Jugador",
  NPC:     "PNJ",
  MONSTER: "Monstruo",
};

const TYPE_COLORS: Record<string, string> = {
  PLAYER:  "bg-gothic-primary/20 text-gothic-primary",
  NPC:     "bg-gothic-success-bg text-gothic-success-text",
  MONSTER: "bg-gothic-danger/20 text-gothic-danger-bright",
};

// D16 — was /templates/[id]/edit (flat); moved under /campaigns/[id] so
// campaignId comes from the URL. templateId is validated against that
// campaignId below so a DM of one campaign can't edit another's template
// by guessing the id (guard in ../layout.tsx only confirms DM-of-*this*-
// campaign, not ownership of the template).
export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string; templateId: string }>;
}) {
  const { id: campaignId, templateId } = await params;
  // Guarded again here despite ../layout.tsx — see templates/page.tsx for
  // why the layout alone isn't enough to stop the query's data from
  // reaching the RSC payload.
  await requireCampaignDm(campaignId);
  const template = await getTemplateById(templateId);

  if (!template || template.campaignId !== campaignId) notFound();

  const bonus = template.initiativeBonus >= 0
    ? `+${template.initiativeBonus}`
    : `${template.initiativeBonus}`;

  const labelClass = "text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant";
  const inputClass =
    "w-full rounded-gothic-sm bg-gothic-surface-low px-3 py-2 font-gothic-body text-sm text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface focus:ring-gothic-primary";
  const numberInputClass = `${inputClass} font-mono`;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <Link
          href={`/campaigns/${campaignId}/templates`}
          className="text-sm text-gothic-on-surface-variant hover:text-gothic-primary transition-colors"
        >
          ← Volver a personajes
        </Link>
        <h1 className="font-gothic-headline text-gothic-headline-sm text-gothic-primary">
          Editar personaje
        </h1>
        <p className="text-sm text-gothic-on-surface-variant">
          Los cambios aplican a futuros combates. Los combates activos no se ven afectados.
        </p>
      </div>

      {/* Form */}
      <form
        action={async (formData: FormData) => {
          "use server";
          const result = await updateTemplate(undefined as never, formData);
          if (result.success) redirect(`/campaigns/${campaignId}/templates`);
        }}
        className="rounded-gothic-md bg-gothic-surface-low ring-1 ring-gothic-outline-variant p-5 space-y-4"
      >
        {/* Hidden ID */}
        <input type="hidden" name="id" value={template.id} />

        {/* Type — read only */}
        <div className="space-y-1.5">
          <p className={labelClass}>Tipo</p>
          <div className="flex items-center gap-2 h-11 px-3 rounded-gothic-sm bg-gothic-surface ring-1 ring-gothic-outline-variant">
            <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-gothic-sm ${TYPE_COLORS[template.type]}`}>
              {TYPE_LABELS[template.type]}
            </span>
            <span className="text-sm text-gothic-on-surface-variant">
              El tipo no se puede cambiar luego de crearlo
            </span>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className={labelClass}>Nombre</label>
          <input
            id="name"
            name="name"
            defaultValue={template.name}
            required
            className={inputClass}
          />
        </div>

        {/* Max HP + Base AC */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="maxHp" className={labelClass}>PV máx.</label>
            <input
              id="maxHp"
              name="maxHp"
              type="number"
              min={1}
              defaultValue={template.maxHp}
              required
              className={numberInputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="baseAc" className={labelClass}>Clase de armadura</label>
            <input
              id="baseAc"
              name="baseAc"
              type="number"
              min={1}
              defaultValue={template.baseAc}
              required
              className={numberInputClass}
            />
          </div>
        </div>

        {/* Initiative bonus */}
        <div className="space-y-1.5">
          <label htmlFor="initiativeBonus" className={labelClass}>
            Bono de iniciativa
            <span className="ml-2 text-gothic-on-surface-variant/70 font-normal normal-case tracking-normal">
              (actual: {bonus})
            </span>
          </label>
          <input
            id="initiativeBonus"
            name="initiativeBonus"
            type="number"
            defaultValue={template.initiativeBonus}
            className={numberInputClass}
          />
        </div>

        {/* Level + Proficiency bonus */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="level" className={labelClass}>Nivel</label>
            <input id="level" name="level" type="number" min={1} defaultValue={template.level} className={numberInputClass} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="proficiencyBonus" className={labelClass}>Bono de competencia</label>
            <input id="proficiencyBonus" name="proficiencyBonus" type="number" defaultValue={template.proficiencyBonus} className={numberInputClass} />
          </div>
        </div>

        {/* Ability scores */}
        <div className="grid grid-cols-3 gap-3">
          {([
            ["str", "FUE"],
            ["dex", "DES"],
            ["con", "CON"],
            ["int", "INT"],
            ["wis", "SAB"],
            ["cha", "CAR"],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <label htmlFor={key} className={labelClass}>{label}</label>
              <input id={key} name={key} type="number" min={1} max={30} defaultValue={template[key]} className={numberInputClass} />
            </div>
          ))}
        </div>

        {/* Exhaustion */}
        <div className="space-y-1.5">
          <label htmlFor="exhaustionLevel" className={labelClass}>Nivel de agotamiento</label>
          <input id="exhaustionLevel" name="exhaustionLevel" type="number" min={0} max={6} defaultValue={template.exhaustionLevel} className={numberInputClass} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Link
            href={`/campaigns/${campaignId}/templates`}
            className="flex-1 h-11 flex items-center justify-center rounded-gothic-sm ring-1 ring-gothic-outline-variant text-gothic-on-surface-variant text-sm font-medium hover:bg-gothic-surface-high transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="flex-1 h-11 rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] hover:bg-gothic-brass-bright transition-all"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
