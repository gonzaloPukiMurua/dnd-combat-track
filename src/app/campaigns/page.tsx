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
};

async function getCampaigns(): Promise<CampaignListItem[]> {
  const [baseUrl, cookieStore] = await Promise.all([getBaseUrl(), cookies()]);

  const res = await fetch(`${baseUrl}/api/campaigns`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });

  if (!res.ok) throw new Error("No se pudieron cargar las campañas");

  const data = await res.json();
  return data.campaigns;
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

      {campaign.hasActiveCombat && (
        <div className="flex items-center gap-2 pt-1">
          <span className="h-2 w-2 rounded-full bg-gothic-brass-bright" />
          <span className="text-xs uppercase tracking-wide text-gothic-brass-bright">Combate activo</span>
        </div>
      )}
    </Link>
  );
}

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-gothic-headline text-gothic-headline-sm uppercase tracking-[0.1em] text-gothic-primary">
        Mis Campañas
      </h1>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-gothic-md bg-gothic-surface-low p-8 text-center ring-1 ring-gothic-outline-variant">
          <p className="font-gothic-headline text-lg text-gothic-on-surface">Todavía no tenés campañas</p>
          <p className="text-sm text-gothic-on-surface-variant">
            Creá una campaña nueva o unite con el código de invitación de tu grupo.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
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
