"use client";

import { useState } from "react";

type Props = {
  code: string;
  /** `lg` — the dedicated post-creation screen; `sm` — a compact hub section. */
  size?: "sm" | "lg";
  /** Optional label rendered above the code. */
  label?: string;
  className?: string;
};

// S2-4 — shared invite-code display + copy control. Extracted from the D5
// confirmation screen (CampaignCreated) so the campaign hub can reuse the
// same clipboard handling and tokens instead of duplicating the state.
//
// Clipboard write with a silent fallback: if the Clipboard API is missing
// (insecure context) the code is still fully visible and `select-all`'able,
// which is the only sensible fallback.
export function InviteCodeChip({ code, size = "sm", label, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — nothing else to fall back to.
    }
  }

  if (size === "lg") {
    return (
      <div data-testid="invite-code-chip" className={`flex w-full flex-col gap-3 ${className ?? ""}`}>
        {label && (
          <p className="pl-1 text-left text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
            {label}
          </p>
        )}
        <div className="flex w-full items-center justify-center rounded-gothic-sm bg-gothic-surface-low p-6 ring-1 ring-gothic-outline-variant shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
          <span data-testid="invite-code-value" className="select-all font-gothic-data text-4xl tracking-[0.3em] text-gothic-primary">
            {code}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          data-testid="invite-code-copy"
          className={`h-12 w-full rounded-gothic-sm font-gothic-body text-sm font-semibold shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all active:scale-[0.98] ${
            copied
              ? "bg-gothic-success-bg text-gothic-success-text"
              : "bg-gothic-primary text-gothic-on-primary hover:bg-gothic-brass-bright"
          }`}
        >
          {copied ? "¡Copiado!" : "Copiar código"}
        </button>
      </div>
    );
  }

  return (
    <div data-testid="invite-code-chip" className={`flex items-center gap-2 ${className ?? ""}`}>
      <span
        data-testid="invite-code-value"
        className="flex-1 select-all rounded-gothic-sm bg-gothic-surface-low px-3 py-2 font-gothic-data text-base tracking-[0.25em] text-gothic-primary ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]"
      >
        {code}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        data-testid="invite-code-copy"
        className={`shrink-0 rounded-gothic-sm px-3 py-2 font-gothic-body text-xs font-semibold uppercase tracking-wide ring-1 transition-colors ${
          copied
            ? "bg-gothic-success-bg text-gothic-success-text ring-gothic-success-text"
            : "bg-gothic-surface-high text-gothic-on-surface ring-gothic-outline-variant hover:bg-gothic-surface"
        }`}
      >
        {copied ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
