// S2-6 — cap for the player-editable `notes` field on CharacterTemplate.
// Lives here (not in the "use server" action module, which may only export
// async functions) so both the action and the client form can import it.
// ~2000 chars is a few solid paragraphs — a scratchpad, not a doc store.
export const MAX_NOTES_LENGTH = 2000;
