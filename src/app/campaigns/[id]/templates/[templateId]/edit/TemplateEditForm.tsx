"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { updateTemplate } from "@/lib/actions/templates";

// A2 — antes, la página llamaba a updateTemplate desde una acción inline y, si el
// servidor rechazaba algo (nivel sobre el tope, texto largo), descartaba el error:
// no guardaba y no avisaba. Este envoltorio muestra el mensaje y, si sale bien,
// vuelve al listado como antes. Los campos siguen viniendo del servidor (children).
// Se envía con onSubmit y no con `action`: React 19 vacía el formulario después de
// una `action`, y ante un error el DM perdería lo que escribió.
export function TemplateEditForm({
  campaignId,
  className,
  children,
}: {
  campaignId: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await updateTemplate({}, formData);
      if (result.success) {
        router.push(`/campaigns/${campaignId}/templates`);
      } else {
        setError(result.error ?? "No se pudieron guardar los cambios. Probá de nuevo.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} aria-busy={isPending} className={className}>
      {children}
      {error && (
        <p role="alert" className="rounded-gothic-sm bg-gothic-danger px-4 py-2 text-center text-sm text-gothic-danger-bright">
          {error}
        </p>
      )}
      {isPending && <p className="text-center text-xs text-gothic-on-surface-variant">Guardando…</p>}
    </form>
  );
}
