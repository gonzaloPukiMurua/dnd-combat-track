import { getTemplates } from "@/lib/actions/templates";
import { CreateTemplateForm } from "@/components/templates/CreateTemplateForm";
import { RestPanel } from "@/components/templates/RestPanel";
import { TemplateListFilter } from "@/components/templates/TemplatesListFilter";

export default async function TemplatesPage() {
  const templates = await getTemplates();

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

      {/* Filterable list */}
      <TemplateListFilter templates={templates} />

      <RestPanel templates={templates} />
    </div>
  );
}
