// A5 / H4 — quién puede crear o reclamar un personaje de jugador en una campaña.
// Pura: la ruta /api/campaigns/[id]/join/character consulta la base y decide acá.

export type JoinMode =
  /** No es miembro: se crea la membresía de jugador junto con el personaje. */
  | "NEW_MEMBER"
  /** Jugador miembro sin personaje propio: se le asigna uno, sin membresía nueva. */
  | "MEMBER_WITHOUT_CHARACTER"
  /** DM, o jugador que ya tiene personaje: no puede. */
  | "REJECT";

export function joinMode(input: {
  membershipRole: "DM" | "PLAYER" | null;
  ownsCharacter: boolean;
}): JoinMode {
  if (input.membershipRole === null) return "NEW_MEMBER";
  if (input.membershipRole === "PLAYER" && !input.ownsCharacter) return "MEMBER_WITHOUT_CHARACTER";
  return "REJECT";
}
