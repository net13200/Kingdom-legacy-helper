import { newId, PURGE_GROUP } from "./defaults";
import { updateCard } from "./kingdom";
import type { ActionResult } from "./turn";
import type { Campaign } from "./types";

const fail = (campaign: Campaign, error: string): ActionResult => ({ campaign, notices: [], error });

/** A "purge 12" picks 1 friendly card from every full group of 12 cards in the deck. */
export function purgePicks(deckCount: number): number {
  if (!Number.isFinite(deckCount) || deckCount < 0) return 0;
  return Math.floor(deckCount / PURGE_GROUP);
}

export interface PurgeInput {
  label: string;
  /** Logged cards being purged. Their fame is added automatically. */
  cardIds: string[];
  /** Fame of purged cards that aren't in your log. */
  extraFame: number;
}

export function applyPurge(c: Campaign, input: PurgeInput): ActionResult {
  if (!Number.isFinite(input.extraFame)) return fail(c, "Numbers only, please.");
  if (input.cardIds.length === 0 && input.extraFame === 0) return fail(c, "Choose the purged cards or enter their fame.");
  let out = c;
  let fame = input.extraFame;
  const notices: string[] = [];
  for (const id of input.cardIds) {
    const card = out.cards.find((k) => k.id === id);
    if (!card) return fail(c, "One of those cards is no longer in your log.");
    if (card.type !== "friendly") return fail(c, `#${card.serial} isn't a friendly card, so it can't be purged.`);
    if (card.status === "purged" || card.status === "destroyed" || card.status === "undiscovered") {
      return fail(c, `#${card.serial} isn't in your kingdom.`);
    }
    fame += card.fame;
    const r = updateCard(out, id, { status: "purged" });
    if (r.error) return fail(c, r.error);
    out = r.campaign;
    notices.push(...r.notices);
  }
  const record = { id: newId(), label: input.label.trim() || "Purge", fame, cardIds: input.cardIds, round: c.round.number };
  return { campaign: { ...out, purges: [...out.purges, record] }, notices: [`Purged fame +${fame}. Write it on a purged-fame sticker.`, ...notices] };
}

export function setPurgedFameAdjust(c: Campaign, n: number): ActionResult {
  if (!Number.isInteger(n)) return fail(c, "Whole numbers only.");
  return { campaign: { ...c, purgedFameAdjust: n }, notices: [] };
}
