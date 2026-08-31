import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/utils/url";
import { EditNameForm } from "./EditNameForm";

// Session is enforced by src/proxy.ts (matcher covers "/profile"). The two
// GETs still 401 without a session, which is treated as "kicked out".

type Profile = { id: string; name: string; email: string };
type CampaignListItem = { id: string; name: string; role: "DM" | "PLAYER" };

async function getProfileData(): Promise<
  { profile: Profile; campaigns: CampaignListItem[] } | null
> {
  const [baseUrl, cookieStore] = await Promise.all([getBaseUrl(), cookies()]);
  const headers = { cookie: cookieStore.toString() };

  // GET /api/campaigns is reused as-is — the same call campaigns/page.tsx
  // makes, not a re-implementation of the query.
  const [profileRes, campaignsRes] = await Promise.all([
    fetch(`${baseUrl}/api/profile`, { headers, cache: "no-store" }),
    fetch(`${baseUrl}/api/campaigns`, { headers, cache: "no-store" }),
  ]);

  if (!profileRes.ok || !campaignsRes.ok) return null;

  const profile: Profile = await profileRes.json();
  const { campaigns }: { campaigns: CampaignListItem[] } = await campaignsRes.json();
  return { profile, campaigns };
}

export default async function ProfilePage() {
  const data = await getProfileData();
  if (!data) redirect("/login");

  const { profile, campaigns } = data;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-gothic-headline text-gothic-headline-sm uppercase tracking-[0.1em] text-gothic-primary">
        Mi Perfil
      </h1>

      <EditNameForm currentName={profile.name} />

      <div className="flex flex-col gap-2">
        <p className="pl-1 text-xs font-medium uppercase tracking-widest text-gothic-on-surface-variant">
          Correo electrónico
        </p>
        <div className="flex h-12 w-full items-center rounded-gothic-sm bg-gothic-surface px-4 text-sm text-gothic-on-surface-variant ring-1 ring-gothic-outline-variant">
          {profile.email}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-widest text-gothic-on-surface-variant">Mis campañas</h2>
        {campaigns.length === 0 ? (
          <p className="rounded-gothic-sm bg-gothic-surface-low p-4 text-sm text-gothic-on-surface-variant ring-1 ring-gothic-outline-variant">
            Todavía no sos parte de ninguna campaña.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/campaigns/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-gothic-sm bg-gothic-surface-low p-3 ring-1 ring-gothic-outline-variant transition-colors hover:ring-gothic-outline"
                >
                  <span className="truncate text-sm text-gothic-on-surface">{c.name}</span>
                  <span className="shrink-0 rounded-gothic-sm bg-gothic-surface-high px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-gothic-on-surface-variant ring-1 ring-gothic-outline-variant">
                    {c.role === "DM" ? "DM" : "Jugador"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
