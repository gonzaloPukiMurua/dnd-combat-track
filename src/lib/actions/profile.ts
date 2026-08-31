"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/utils/url";

export type UpdateProfileState = {
  error?: string;
};

// S2-7 — thin action, same shape as the campaign edit flow: validate, then
// PATCH the REST route with the session cookie forwarded, redirect back to
// the page on success. Only `name` is editable.
export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "El nombre es obligatorio" };

  const [baseUrl, cookieStore] = await Promise.all([getBaseUrl(), cookies()]);

  const res = await fetch(`${baseUrl}/api/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieStore.toString(),
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message =
      data?.error === "NAME_REQUIRED"
        ? "El nombre es obligatorio"
        : data?.error === "UNAUTHENTICATED"
          ? "Tu sesión expiró. Volvé a iniciar sesión."
          : "No se pudo guardar. Probá de nuevo.";
    return { error: message };
  }

  redirect("/profile");
}
