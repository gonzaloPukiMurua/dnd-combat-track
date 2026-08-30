import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/utils/url";
import { computeCurrentActor } from "@/domain/combat/rules";

// Session is enforced by src/proxy.ts (matcher covers "/campaigns/:path*").
// Membership is enforced by the API itself (403 NOT_A_MEMBER) — mapped to a
// 404 here so a non-member can't tell the campaign exists at all.

type CombatSummary = { id: string; name: string; status: "SETUP" | "ACTIVE" | "FINISHED"; round: number };
type ActiveCombat = CombatSummary & {
  currentTurnIndex: number;
  // turnOrder + deathSaveFailures are needed to resolve the current actor the
  // same way the combat screens do (computeCurrentActor). The API already
  // returns the full participant rows (COMBAT_DETAIL_INCLUDE) — this type was
  // just under-declaring them.
  participants: { id: string; displayName: string; turnOrder: number; deathSaveFailures: number }[];
};

type HubData = {
  campaign: { id: string; name: string; description: string | null; inviteCode?: string };
  role: "DM" | "PLAYER";
  activeCombat: ActiveCombat | null;
  previousCombats: CombatSummary[];
  partyStatus?: { playerCount: number; averageHpPercent: number | null };
  ownCharacter?: { id: string; name: string; level: number; maxHp: number; currentHp: number | null; baseAc: number } | null;
};

async function getHubData(campaignId: string): Promise<HubData | { error: string }> {
  const [baseUrl, cookieStore] = await Promise.all([getBaseUrl(), cookies()]);

  const res = await fetch(`${baseUrl}/api/campaigns/${campaignId}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) return { error: data?.error ?? "UNKNOWN" };
  return data;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-gothic-sm bg-gothic-surface-high p-3 ring-1 ring-gothic-outline-variant">
      <span className="text-[10px] uppercase tracking-widest text-gothic-on-surface-variant">{label}</span>
      <span className="font-gothic-headline text-lg text-gothic-on-surface">{value}</span>
    </div>
  );
}

function StatusBlock({ data }: { data: HubData }) {
  if (data.role === "DM") {
    const status = data.partyStatus;
    return (
      <section className="flex flex-col gap-3 rounded-gothic-sm bg-gothic-surface-low p-4 ring-1 ring-gothic-outline-variant">
        <span className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Estado del grupo</span>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="PV promedio" value={status?.averageHpPercent != null ? `${status.averageHpPercent}%` : "—"} />
          <StatBox label="Jugadores" value={String(status?.playerCount ?? 0)} />
        </div>
      </section>
    );
  }

  const character = data.ownCharacter;
  return (
    <section className="flex flex-col gap-3 rounded-gothic-sm bg-gothic-surface-low p-4 ring-1 ring-gothic-outline-variant">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Mi personaje</span>
        {character && (
          <span className="rounded-gothic-sm bg-gothic-surface-container px-2 py-0.5 font-gothic-data text-xs text-gothic-primary ring-1 ring-gothic-outline-variant">
            NV {character.level}
          </span>
        )}
      </div>
      {character ? (
        <>
          <h2 className="font-gothic-headline text-lg text-gothic-primary">{character.name}</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="PV" value={`${character.currentHp ?? character.maxHp}/${character.maxHp}`} />
            <StatBox label="CA" value={String(character.baseAc)} />
          </div>
        </>
      ) : (
        <p className="text-sm text-gothic-on-surface-variant">No se encontró un personaje asignado.</p>
      )}
    </section>
  );
}

function ActiveCombatCard({ combat, role }: { combat: ActiveCombat; role: "DM" | "PLAYER" }) {
  // S2-12 — resolve the actor through the shared rule, not a raw index:
  // currentTurnIndex counts positions in the death-save-active order, so a
  // dead combatant earlier in the list would otherwise shift this by one.
  const currentTurn = computeCurrentActor(combat.participants, combat.currentTurnIndex);
  const isSetup = combat.status === "SETUP";

  const href =
    role === "DM" ? (isSetup ? `/combat/${combat.id}/setup` : `/combat/${combat.id}`) : `/combat/${combat.id}/spectate`;
  const cta = role === "DM" ? (isSetup ? "Continuar preparación" : "Gestionar tablero") : "Ver combate";

  return (
    <section className="flex flex-col gap-3 rounded-gothic-sm bg-gothic-surface p-4 ring-1 ring-gothic-primary">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-gothic-primary">Encuentro actual</span>
          <h2 className="font-gothic-headline text-lg text-gothic-on-surface">{combat.name}</h2>
        </div>
        <span className="shrink-0 rounded-gothic-sm bg-gothic-danger px-2 py-0.5 text-[10px] uppercase tracking-widest text-gothic-danger-bright">
          {isSetup ? "En preparación" : "En curso"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-gothic-outline-variant/40 pt-3">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-gothic-on-surface-variant">Ronda</span>
          <span className="font-gothic-data text-lg text-gothic-primary">{String(combat.round).padStart(2, "0")}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-gothic-on-surface-variant">Turno de</span>
          <span className="text-sm text-gothic-on-surface">{currentTurn?.displayName ?? "—"}</span>
        </div>
      </div>

      <Link
        href={href}
        className="mt-1 flex h-11 w-full items-center justify-center rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all hover:bg-gothic-brass-bright active:scale-[0.98]"
      >
        {cta}
      </Link>
    </section>
  );
}

function PreviousCombats({ combats }: { combats: CombatSummary[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Combates anteriores</h2>
      {combats.length === 0 ? (
        <p className="rounded-gothic-sm bg-gothic-surface-low p-4 text-sm text-gothic-on-surface-variant ring-1 ring-gothic-outline-variant">
          Todavía no hay combates finalizados en esta campaña.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {combats.map((combat) => (
            <div
              key={combat.id}
              className="flex items-center justify-between rounded-gothic-sm bg-gothic-surface p-3 ring-1 ring-gothic-outline-variant"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-gothic-headline text-sm text-gothic-on-surface">{combat.name}</span>
                <span className="font-gothic-data text-xs text-gothic-on-surface-variant">{combat.round} rondas</span>
              </div>
              <span className="rounded-gothic-sm bg-gothic-surface-container px-2 py-0.5 text-[10px] uppercase tracking-widest text-gothic-on-surface-variant ring-1 ring-gothic-outline-variant">
                Finalizado
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DmQuickAccess({ campaignId, hasActiveCombat }: { campaignId: string; hasActiveCombat: boolean }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/campaigns/${campaignId}/templates`}
          className="flex flex-col items-center justify-center gap-2 rounded-gothic-sm bg-gothic-surface-low p-4 text-center ring-1 ring-gothic-outline-variant transition-colors hover:bg-gothic-surface-high"
        >
          <span className="font-gothic-body text-sm font-semibold uppercase tracking-widest text-gothic-on-surface">
            Personajes
          </span>
        </Link>
        <Link
          href={`/campaigns/${campaignId}/groups`}
          className="flex flex-col items-center justify-center gap-2 rounded-gothic-sm bg-gothic-surface-low p-4 text-center ring-1 ring-gothic-outline-variant transition-colors hover:bg-gothic-surface-high"
        >
          <span className="font-gothic-body text-sm font-semibold uppercase tracking-widest text-gothic-on-surface">
            Grupos
          </span>
        </Link>
      </div>

      {/* D14 — solo se ofrece si no hay ya un combate SETUP/ACTIVE en esta
          campaña: la ActiveCombatCard de arriba ya cubre ese caso, y
          createCombat rechaza un segundo combate simultáneo por campaña. */}
      {!hasActiveCombat && (
        <Link
          href={`/campaigns/${campaignId}/combat/new`}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-gothic-sm bg-gothic-primary font-gothic-body text-sm font-semibold uppercase tracking-widest text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.2)] transition-all hover:bg-gothic-brass-bright active:scale-[0.98]"
        >
          Nuevo combate
        </Link>
      )}
    </section>
  );
}

export default async function CampaignHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params;
  const data = await getHubData(campaignId);

  if ("error" in data) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-gothic-headline text-gothic-headline-sm text-gothic-primary">{data.campaign.name}</h1>
        {data.campaign.description && (
          <p className="text-sm text-gothic-on-surface-variant">{data.campaign.description}</p>
        )}
      </div>

      <StatusBlock data={data} />

      {data.activeCombat ? (
        <ActiveCombatCard combat={data.activeCombat} role={data.role} />
      ) : (
        <p className="rounded-gothic-sm bg-gothic-surface-low p-4 text-center text-sm text-gothic-on-surface-variant ring-1 ring-gothic-outline-variant">
          No hay combate activo en este momento.
        </p>
      )}

      {data.role === "DM" && (
        <DmQuickAccess campaignId={data.campaign.id} hasActiveCombat={!!data.activeCombat} />
      )}

      <PreviousCombats combats={data.previousCombats} />
    </div>
  );
}
