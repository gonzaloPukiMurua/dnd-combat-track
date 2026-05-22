"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCombatByJoinCode } from "@/lib/actions/combat";
import { setCookie } from "cookies-next";

type Participant = {
  id:          string;
  displayName: string;
  template:    { type: string };
};

const TYPE_COLORS: Record<string, string> = {
  PLAYER:  "bg-indigo-100 text-indigo-700 border-indigo-200",
  NPC:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  MONSTER: "bg-red-100 text-red-700 border-red-200",
};

export default function JoinPage() {
  const router = useRouter();

  const [code,         setCode]         = useState("");
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [combatId,     setCombatId]     = useState<string | null>(null);
  const [combatName,   setCombatName]   = useState<string>("");
  const [error,        setError]        = useState<string | null>(null);
  const [isLoading,    setIsLoading]    = useState(false);

  // Step 1 — look up combat by code
  async function handleLookup() {
    if (!code.trim()) return;
    setError(null);
    setIsLoading(true);

    try {
      const combat = await getCombatByJoinCode(code);

      if (!combat) {
        setError("Code not found. Check with your DM.");
        return;
      }
      if (combat.status !== "ACTIVE") {
        setError("This combat hasn't started yet. Ask your DM to start it first.");
        return;
      }

      setCombatId(combat.id);
      setCombatName(combat.name);
      setParticipants(
        combat.participants.map((p) => ({
          id:          p.id,
          displayName: p.displayName,
          template:    { type: p.template.type },
        }))
      );
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Step 2 — player picks their character, set cookie, redirect
  async function handleSelectCharacter(participantId: string) {
    if (!combatId) return;

    // Set a cookie so the spectate page knows who this player is
    setCookie("player_participant_id", participantId, { maxAge: 60 * 60 * 24 * 7 });
    setCookie("player_combat_id", combatId, { maxAge: 60 * 60 * 24 * 7 });
    router.push(`/combat/${combatId}/spectate`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto shadow-lg">
            <span className="text-3xl">⚔️</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Join combat</h1>
          <p className="text-slate-400 text-sm">Enter the code your DM shared with you.</p>
        </div>

        {/* Step 1 — code input */}
        {!participants && (
          <div className="space-y-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="e.g. AB3X7K"
              maxLength={6}
              className="w-full border-2 border-slate-200 rounded-2xl px-4 h-14 text-2xl text-center font-mono font-bold tracking-widest focus:outline-none focus:border-blue-500 transition-colors uppercase"
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-center">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleLookup}
              disabled={code.length < 6 || isLoading}
              className="w-full h-12 bg-slate-900 text-white rounded-2xl font-semibold text-base hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              {isLoading ? "Looking up…" : "Join →"}
            </button>
          </div>
        )}

        {/* Step 2 — pick your character */}
        {participants && (
          <div className="space-y-3">
            <div className="text-center">
              <p className="font-semibold text-slate-800">{combatName}</p>
              <p className="text-sm text-slate-400">Who are you playing?</p>
            </div>

            {participants.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectCharacter(p.id)}
                className="w-full flex items-center gap-3 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
              >
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${TYPE_COLORS[p.template.type] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  {p.template.type}
                </span>
                <span className="font-semibold text-slate-800 flex-1 group-hover:text-blue-700 transition-colors">
                  {p.displayName}
                </span>
                <span className="text-slate-300 group-hover:text-blue-400 transition-colors">→</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => { setParticipants(null); setCode(""); }}
              className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-2"
            >
              ← Enter a different code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}