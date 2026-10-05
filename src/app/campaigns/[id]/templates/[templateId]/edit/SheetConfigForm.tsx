"use client";

import { useState, useTransition } from "react";
import { SKILLS } from "@/domain/character/rules";
import { updateTemplateSheet } from "@/lib/actions/sheet";

// P2 / D-8 — el DM marca las competencias del personaje a mano.
const ABILITIES = [
  { key: "str", label: "Fuerza" },
  { key: "dex", label: "Destreza" },
  { key: "con", label: "Constitución" },
  { key: "int", label: "Inteligencia" },
  { key: "wis", label: "Sabiduría" },
  { key: "cha", label: "Carisma" },
] as const;

const labelClass = "text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant";
const boxClass = "flex items-center gap-2 text-sm text-gothic-on-surface";

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function SheetConfigForm({
  templateId,
  initialSaves,
  initialSkills,
  initialExpertise,
  initialSpellcasting,
}: {
  templateId: string;
  initialSaves: string[];
  initialSkills: string[];
  initialExpertise: string[];
  initialSpellcasting: string | null;
}) {
  const [saves, setSaves] = useState(initialSaves);
  const [skills, setSkills] = useState(initialSkills);
  const [expertise, setExpertise] = useState(initialExpertise);
  const [spell, setSpell] = useState(initialSpellcasting ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleSkill(name: string) {
    // Quitar la competencia también quita la pericia (no puede haber pericia sin competencia).
    if (skills.includes(name)) setExpertise((e) => e.filter((x) => x !== name));
    setSkills((s) => toggle(s, name));
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateTemplateSheet(templateId, {
        saveProficiencies: saves,
        skillProficiencies: skills,
        skillExpertise: expertise,
        spellcastingAbility: spell || null,
      });
      setMsg(r.ok ? { ok: true, text: "Competencias guardadas" } : { ok: false, text: r.error });
    });
  }

  return (
    <section className="rounded-gothic-md bg-gothic-surface-low ring-1 ring-gothic-outline-variant p-5 space-y-5">
      <div className="space-y-1">
        <h2 className="font-gothic-headline text-lg text-gothic-primary">Competencias</h2>
        <p className="text-xs text-gothic-on-surface-variant">Las marca el DM. El bono de competencia sale del nivel.</p>
      </div>

      <div className="space-y-2">
        <p className={labelClass}>Competencia en salvaciones</p>
        <div className="grid grid-cols-2 gap-2">
          {ABILITIES.map((a) => (
            <label key={a.key} className={boxClass}>
              <input type="checkbox" checked={saves.includes(a.key)} onChange={() => setSaves((s) => toggle(s, a.key))} />
              {a.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className={labelClass}>Habilidades (competencia · pericia)</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {SKILLS.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-2 text-sm text-gothic-on-surface">
              <label className={boxClass}>
                <input type="checkbox" checked={skills.includes(s.name)} onChange={() => toggleSkill(s.name)} />
                {s.name}
              </label>
              <label className="flex items-center gap-1 text-xs text-gothic-on-surface-variant">
                <input
                  type="checkbox"
                  disabled={!skills.includes(s.name)}
                  checked={expertise.includes(s.name)}
                  onChange={() => setExpertise((e) => toggle(e, s.name))}
                />
                pericia
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="spellcastingAbility" className={labelClass}>Característica de lanzamiento</label>
        <select
          id="spellcastingAbility"
          value={spell}
          onChange={(e) => setSpell(e.target.value)}
          className="w-full rounded-gothic-sm bg-gothic-surface-low px-3 py-2 text-sm text-gothic-on-surface ring-1 ring-gothic-outline-variant"
        >
          <option value="">Sin conjuros</option>
          {ABILITIES.map((a) => (
            <option key={a.key} value={a.key}>{a.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="h-11 px-5 rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary hover:bg-gothic-brass-bright disabled:opacity-40"
        >
          {isPending ? "Guardando…" : "Guardar competencias"}
        </button>
        {msg && (
          <span className={`text-xs ${msg.ok ? "text-gothic-success-text" : "text-gothic-danger-bright"}`}>{msg.text}</span>
        )}
      </div>
    </section>
  );
}
