import { getTemplates } from "@/lib/actions/templates";
import { CreateTemplateForm } from "@/components/templates/CreateTemplateForm";
import { TemplateCard } from "@/components/templates/TemplateCard";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  const players  = templates.filter((t) => t.type === "PLAYER");
  const npcs     = templates.filter((t) => t.type === "NPC");
  const monsters = templates.filter((t) => t.type === "MONSTER");

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">

      <h1 className="text-2xl font-bold">Templates</h1>

      {/* Create form */}
      <CreateTemplateForm />

      {/* Empty state */}
      {templates.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">
          No templates yet. Create your first one above.
        </p>
      )}

      {/* Players */}
      {players.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Players
          </h2>
          {players.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </section>
      )}

      {/* NPCs */}
      {npcs.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            NPCs
          </h2>
          {npcs.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </section>
      )}

      {/* Monsters */}
      {monsters.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Monsters
          </h2>
          {monsters.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </section>
      )}

    </div>
  );
}
