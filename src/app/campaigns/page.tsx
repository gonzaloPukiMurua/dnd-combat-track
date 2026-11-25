import Link from "next/link";
import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/utils/url";

// Session is already enforced by src/proxy.ts (matcher covers "/campaigns"
// and "/campaigns/:path*") — no auth check needed here.

type CampaignListItem = {
  id: string;
  name: string;
  description: string | null;
  role: "DM" | "PLAYER";
  hasActiveCombat: boolean;
  // A5 — personaje propio (campañas donde juega) y cantidad de jugadores (donde dirige).
  character: { name: string; level: number } | null;
  playerCount: number | null;
};

type CampaignsData = { user: { name: string; email: string } | null; campaigns: CampaignListItem[] };

async function getCampaigns(): Promise<CampaignsData> {
  const [baseUrl, cookieStore] = await Promise.all([getBaseUrl(), cookies()]);

  const res = await fetch(`${baseUrl}/api/campaigns`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });

  if (!res.ok) throw new Error("No se pudieron cargar las campañas");

  const data = await res.json();
  return { user: data.user ?? null, campaigns: data.campaigns };
}

function RoleBadge({ role }: { role: "DM" | "PLAYER" }) {
  if (role === "DM") {
    return (
      <span className="shrink-0 rounded-gothic-sm bg-gothic-primary px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-gothic-on-primary">
        DM
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-gothic-sm bg-gothic-surface-high px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-gothic-on-surface-variant ring-1 ring-gothic-outline-variant">
      Jugador
    </span>
  );
}

function CampaignCard({ campaign }: { campaign: CampaignListItem }) {
  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="flex flex-col gap-2 rounded-gothic-md bg-gothic-surface-low p-4 ring-1 ring-gothic-outline-variant transition-colors hover:ring-gothic-outline"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-gothic-headline text-lg font-semibold text-gothic-on-surface">{campaign.name}</h2>
        <RoleBadge role={campaign.role} />
      </div>

      {campaign.description && (
        <p className="line-clamp-2 text-sm text-gothic-on-surface-variant">{campaign.description}</p>
      )}

      {campaign.role === "PLAYER" && (
        campaign.character ? (
          <p className="text-sm text-gothic-on-surface">
            {campaign.character.name}
            <span className="ml-2 font-gothic-data text-xs text-gothic-primary">NV {campaign.character.level}</span>
          </p>
        ) : (
          <p className="text-sm text-gothic-brass-bright">Todavía no tenés personaje en esta campaña</p>
        )
      )}

      {campaign.role === "DM" && campaign.playerCount !== null && (
        <p className="text-xs uppercase tracking-wide text-gothic-on-surface-variant">
          {campaign.playerCount === 1 ? "1 jugador" : `${campaign.playerCount} jugadores`}
        </p>
      )}

      {campaign.hasActiveCombat && (
        <div className="flex items-center gap-2 pt-1">
          <span className="h-2 w-2 rounded-full bg-gothic-brass-bright" />
          <span className="text-xs uppercase tracking-wide text-gothic-brass-bright">Combate activo</span>
        </div>
      )}
    </Link>
  );
}

function CampaignSection({ title, campaigns, empty }: { title: string; campaigns: CampaignListItem[]; empty: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">{title}</h2>
      {campaigns.length === 0 ? (
        <p className="text-sm text-gothic-on-surface-variant">{empty}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function CampaignsPage() {
  const { user, campaigns } = await getCampaigns();
  // A5 / H1 y H6 — el panel separa las campañas donde juego de las que dirijo.
  const playing = campaigns.filter((c) => c.role === "PLAYER");
  const running = campaigns.filter((c) => c.role === "DM");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-gothic-headline text-gothic-headline-sm uppercase tracking-[0.1em] text-gothic-primary">
          Mis Campañas
        </h1>
        {user && (
          <p className="text-sm text-gothic-on-surface-variant">
            {user.name} · {user.email}
            <Link href="/profile" className="ml-3 text-xs uppercase tracking-widest underline decoration-gothic-outline-variant underline-offset-4 hover:text-gothic-primary">
              Perfil
            </Link>
          </p>
        )}
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-gothic-md bg-gothic-surface-low p-8 text-center ring-1 ring-gothic-outline-variant">
          <p className="font-gothic-headline text-lg text-gothic-on-surface">Todavía no tenés campañas</p>
          <p className="text-sm text-gothic-on-surface-variant">
            Creá una campaña nueva o unite con el código de invitación de tu grupo.
          </p>
        </div>
      ) : (
        <>
          <CampaignSection title="Juego en" campaigns={playing} empty="No jugás en ninguna campaña todavía." />
          <CampaignSection title="Dirijo" campaigns={running} empty="No dirigís ninguna campaña todavía." />
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/campaigns/new"
          className="flex-1 rounded-gothic-md bg-gothic-primary px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide text-gothic-on-primary shadow-[inset_0_1px_0px_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.5)] transition-colors hover:bg-gothic-accent-brass"
        >
          Crear campaña
        </Link>
        <Link
          href="/join"
          className="flex-1 rounded-gothic-md bg-gothic-surface-high px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide text-gothic-on-surface ring-1 ring-gothic-outline-variant transition-colors hover:bg-gothic-surface"
        >
          Unirme
        </Link>
      </div>
    </div>
  );
}
