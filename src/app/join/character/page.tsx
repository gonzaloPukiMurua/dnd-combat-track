import Link from "next/link";
import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/utils/url";
import { CharacterPicker } from "./CharacterPicker";

type AvailableCharacter = {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  currentHp: number | null;
  baseAc: number;
};

const ERROR_MESSAGES: Record<string, string> = {
  CAMPAIGN_NOT_FOUND: "Esa campaña no existe.",
  EMAIL_NOT_VERIFIED: "Verificá tu email antes de unirte a una campaña.",
  ALREADY_MEMBER: "Ya sos miembro de esta campaña.",
};

function ErrorMessage({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-gothic-sm bg-gothic-surface p-8 text-center ring-1 ring-gothic-outline-variant">
      <p className="text-sm text-gothic-on-surface-variant">{text}</p>
      <Link
        href="/join"
        className="text-sm text-gothic-primary underline decoration-gothic-outline-variant underline-offset-4 hover:text-gothic-brass-bright hover:decoration-gothic-primary"
      >
        Volver a intentar
      </Link>
    </div>
  );
}

// Session is already enforced by src/proxy.ts (matcher covers "/join" and
// "/join/:path*") — no auth redirect needed here.
export default async function JoinCharacterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const campaignId = typeof params.campaignId === "string" ? params.campaignId : undefined;

  if (!campaignId) {
    return <ErrorMessage text="Falta el código de campaña. Volvé a ingresar tu código de invitación." />;
  }

  const [baseUrl, cookieStore] = await Promise.all([getBaseUrl(), cookies()]);

  const res = await fetch(`${baseUrl}/api/campaigns/${campaignId}/join/character`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const text = (data?.error && ERROR_MESSAGES[data.error]) || "No se pudo cargar la campaña. Probá de nuevo.";
    return <ErrorMessage text={text} />;
  }

  const characters: AvailableCharacter[] = data.characters;

  return (
    <CharacterPicker campaignId={campaignId} campaignName={data.campaignName} characters={characters} />
  );
}
