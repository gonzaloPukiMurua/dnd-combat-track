"use client";

import { useState } from "react";

export default function CreateCombatForm({
  templates,
  action,
}: {
  templates: any[];
  action: (formData: FormData) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  return (
    <form action={action} className="space-y-4 border p-4 rounded">
      <input
        name="name"
        placeholder="Combat name"
        className="border p-2 w-full"
      />

      <div className="grid grid-cols-2 gap-2">
        {templates.map((t) => (
          <label
            key={t.id}
            className={`border p-2 cursor-pointer ${
              selected.includes(t.id) ? "bg-blue-100" : ""
            }`}
          >
            <input
              type="checkbox"
              name="templates"
              value={t.id}
              onChange={() => toggle(t.id)}
              className="mr-2"
            />
            {t.name} ({t.type})
          </label>
        ))}
      </div>

      <button className="bg-green-600 text-white p-2 w-full rounded">
        Start Combat
      </button>
    </form>
  );
}