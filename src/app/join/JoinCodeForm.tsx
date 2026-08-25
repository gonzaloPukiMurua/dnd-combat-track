"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { joinCampaign, type JoinCampaignState } from "@/lib/actions/campaigns";
import { resendVerificationEmail } from "@/lib/actions/auth";

const INITIAL: JoinCampaignState = {};

export function JoinCodeForm({
  initialCode,
  emailVerified,
  email,
}: {
  initialCode: string;
  emailVerified: boolean;
  email: string;
}) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(joinCampaign, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  // Magic link (/join?code=XXXXXX): skip straight to submitting if the user
  // is already logged in and verified — otherwise they still land on the
  // prefilled input, blocked by the banner below like anyone else.
  useEffect(() => {
    if (initialCode.length === 6 && emailVerified) {
      formRef.current?.requestSubmit();
    }
    // Only ever auto-submit once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state.campaignId) return;
    router.push(
      state.alreadyMember ? `/campaigns/${state.campaignId}` : `/join/character?campaignId=${state.campaignId}`
    );
  }, [state.campaignId, state.alreadyMember, router]);

  return (
    <div className="flex flex-col gap-6">
      {!emailVerified && (
        <div className="flex flex-col items-start gap-3 rounded-gothic-sm bg-gothic-danger/10 p-4 ring-1 ring-gothic-danger/30">
          <p className="text-sm text-gothic-on-surface">
            Tu cuenta todavía no fue verificada. Revisá tu correo para poder unirte a una campaña.
          </p>
          <form action={resendVerificationEmail}>
            <input type="hidden" name="email" value={email} />
            <button type="submit" className="text-sm font-medium text-gothic-primary hover:underline">
              Reenviar verificación
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-6 rounded-gothic-sm bg-gothic-surface p-6 ring-1 ring-gothic-outline-variant">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-gothic-headline text-gothic-headline-sm text-gothic-on-surface">
            Unirse a una campaña
          </h1>
          <p className="text-sm text-gothic-on-surface-variant">
            Ingresá el código de invitación que te compartió tu DM.
          </p>
        </div>

        <form ref={formRef} action={action} className="flex flex-col gap-3">
          <div className="space-y-1">
            <label
              htmlFor="inviteCode"
              className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant"
            >
              Código de invitación
            </label>
            <input
              id="inviteCode"
              name="inviteCode"
              autoComplete="off"
              defaultValue={initialCode}
              maxLength={6}
              placeholder="XXXXXX"
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
              }}
              className="w-full rounded-gothic-sm bg-gothic-surface-low px-4 py-4 text-center font-gothic-data text-lg uppercase tracking-widest text-gothic-on-surface outline-none ring-1 ring-gothic-outline-variant shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] transition-all placeholder:text-gothic-outline focus:bg-gothic-surface-low focus:ring-gothic-primary"
            />
          </div>

          {state.error && (
            <p className="rounded-gothic-sm bg-gothic-danger px-4 py-2 text-center text-sm text-gothic-danger-bright">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={!emailVerified || isPending}
            className="h-12 w-full rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all hover:bg-gothic-brass-bright active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-gothic-primary"
          >
            {isPending ? "Uniéndote..." : "Unirme a la campaña"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-gothic-on-surface-variant">
        ¿Perdiste el código? Revisá el correo o mensaje donde te invitaron, o pedile uno nuevo a tu DM.
      </p>
    </div>
  );
}
