import { createTemplate, getTemplates } from "./actions";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold">Templates</h1>

      {/* CREATE FORM */}
      <form
        action={createTemplate}
        className="grid grid-cols-2 gap-3 border p-4 rounded"
      >
        <input
          name="name"
          placeholder="Name"
          className="border p-2 col-span-2"
          required
        />

        <select name="type" className="border p-2">
          <option value="PLAYER">Player</option>
          <option value="NPC">NPC</option>
          <option value="MONSTER">Monster</option>
        </select>

        <input
          name="maxHp"
          type="number"
          placeholder="HP"
          className="border p-2"
          required
        />

        <input
          name="baseAc"
          type="number"
          placeholder="AC"
          className="border p-2"
          required
        />

        <input
          name="initiativeBonus"
          type="number"
          placeholder="Initiative"
          className="border p-2 col-span-2"
          required
        />

        <button className="bg-blue-500 text-white p-2 col-span-2 rounded">
          Create Template
        </button>
      </form>

      {/* TEMPLATE LIST */}
      <div className="space-y-2">
        {templates.length === 0 && (
          <p className="text-gray-500">No templates yet</p>
        )}

        {templates.map((t) => (
          <div
            key={t.id}
            className="border p-3 rounded flex justify-between items-center"
          >
            <div>
              <p className="font-semibold">
                {t.name} ({t.type})
              </p>
              <p className="text-sm text-gray-500">
                HP {t.maxHp} | AC {t.baseAc} | Init {t.initiativeBonus}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}