"use server";

import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/utils/url";

export type CreateCampaignState = {
  error?: string;
  campaign?: { id: string; name: string; inviteCode: string };
};

// D4 — goes through the actual POST /api/campaigns route (Épica C) rather
// than touching Prisma directly, so campaign creation stays defined in one
// place.
export async function createCampaign(
  _prevState: CreateCampaignState,
  formData: FormData
): Promise<CreateCampaignState> {
  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim();

  if (!name) return { error: "El nombre es obligatorio" };

  const [baseUrl, cookieStore] = await Promise.all([getBaseUrl(), cookies()]);

  const res = await fetch(`${baseUrl}/api/campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieStore.toString(),
    },
    body: JSON.stringify({ name, description: description || undefined }),
  });

  if (!res.ok) {
    return { error: "No se pudo crear la campaña. Probá de nuevo." };
  }

  const data: { campaign: { id: string; name: string; inviteCode: string } } = await res.json();
  return { campaign: data.campaign };
}

export type JoinCampaignState = {
  error?: string;
  campaignId?: string;
  alreadyMember?: boolean;
};

// D6 — goes through POST /api/campaigns/join (C2). Only validates the code
// and email verification — never creates the CampaignMember itself, that
// happens in join/character (C3) once a character is picked or created.
export async function joinCampaign(
  _prevState: JoinCampaignState,
  formData: FormData
): Promise<JoinCampaignState> {
  const inviteCode = formData.get("inviteCode")?.toString().trim().toUpperCase();
  if (!inviteCode || inviteCode.length !== 6) {
    return { error: "Ingresá un código de 6 caracteres." };
  }

  const [baseUrl, cookieStore] = await Promise.all([getBaseUrl(), cookies()]);

  const res = await fetch(`${baseUrl}/api/campaigns/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieStore.toString(),
    },
    body: JSON.stringify({ inviteCode }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data?.error === "INVALID_INVITE_CODE"
        ? "Código inválido. Confirmalo con tu DM."
        : data?.error === "EMAIL_NOT_VERIFIED"
          ? "Verificá tu email antes de unirte a una campaña."
          : "No se pudo procesar el código. Probá de nuevo.";
    return { error: message };
  }

  return { campaignId: data.campaignId, alreadyMember: data.alreadyMember };
}

export type JoinCharacterState = {
  error?: string;
  member?: { id: string; campaignId: string };
};

// D7 — goes through POST /api/campaigns/[id]/join/character (C3). Branches
// on the same discriminator the route itself uses: a characterTemplateId
// present means "claim existing", absent means "create new".
export async function joinCampaignWithCharacter(
  _prevState: JoinCharacterState,
  formData: FormData
): Promise<JoinCharacterState> {
  const campaignId = formData.get("campaignId")?.toString();
  if (!campaignId) return { error: "Falta el id de la campaña." };

  const characterTemplateId = formData.get("characterTemplateId")?.toString();

  const body: Record<string, unknown> = characterTemplateId
    ? { characterTemplateId }
    : {
        name: formData.get("name")?.toString().trim(),
        maxHp: Number(formData.get("maxHp")),
        baseAc: Number(formData.get("baseAc")),
      };

  const [baseUrl, cookieStore] = await Promise.all([getBaseUrl(), cookies()]);

  const res = await fetch(`${baseUrl}/api/campaigns/${campaignId}/join/character`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieStore.toString(),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data?.error === "TEMPLATE_ALREADY_TAKEN"
        ? "Alguien más ya eligió ese personaje. Elegí otro."
        : data?.error === "TEMPLATE_NOT_FOUND"
          ? "Ese personaje ya no está disponible."
          : data?.error === "NAME_REQUIRED"
            ? "El nombre es obligatorio."
            : data?.error === "INVALID_MAX_HP"
              ? "Ingresá un HP máximo válido."
              : data?.error === "INVALID_BASE_AC"
                ? "Ingresá una CA válida."
                : data?.error === "ALREADY_MEMBER"
                  ? "Ya sos miembro de esta campaña."
                  : "No se pudo unir a la campaña. Probá de nuevo.";
    return { error: message };
  }

  return { member: data.member };
}
