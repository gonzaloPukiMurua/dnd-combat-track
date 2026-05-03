import {
  getTemplates,
  createCombat,
  getCurrentCombat,
} from "./actions";
import CreateCombatForm from "./CreateCombatForm";

export default async function CombatPage() {
  const combat = await getCurrentCombat();

  // If no combat → show creation form
  if (!combat) {
    const templates = await getTemplates();

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Start Combat</h1>

        <CreateCombatForm
          templates={templates}
          action={createCombat}
        />
      </div>
    );
  }

  // If combat exists → show initiative
  return (
    <div className="grid grid-cols-3 gap-4 h-[80vh]">
      
      {/* Initiative */}
      <div className="border p-4">
        <h2 className="font-bold mb-2">Initiative</h2>

        {combat.participants.map((p) => (
          <div key={p.id} className="border p-2 mb-2">
            <p className="font-semibold">{p.nameOverride}</p>
            <p className="text-sm">
              HP {p.currentHp} | AC {p.baseAc} | Init {p.initiative}
            </p>
          </div>
        ))}
      </div>

      {/* Placeholder */}
      <div className="border p-4">
        <h2 className="font-bold">Selected</h2>
        <p className="text-gray-500">Coming next</p>
      </div>

      {/* Placeholder */}
      <div className="border p-4">
        <h2 className="font-bold">Log</h2>
        <p className="text-gray-500">Coming next</p>
      </div>

    </div>
  );
}