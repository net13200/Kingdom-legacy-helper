import { newId, STARTING_KINGDOM } from "./defaults";
import type { ActionResult } from "./turn";
import type { Campaign, CardRecord, CardStatus, CardType } from "./types";

const ok = (campaign: Campaign, ...notices: string[]): ActionResult => ({ campaign, notices });
const fail = (campaign: Campaign, error: string): ActionResult => ({ campaign, notices: [], error });

export const STATUS_LABELS: Record<CardStatus, string> = {
  kingdom: "In kingdom",
  permanent: "Permanent",
  destroyed: "Destroyed",
  purged: "Purged",
  undiscovered: "Undiscovered",
};

export const TYPE_LABELS: Record<CardType, string> = {
  friendly: "Friendly",
  enemy: "Enemy",
  event: "Event",
  parchment: "Parchment",
};

/** Statuses whose fame counts towards the kingdom score. */
export const COUNTS_FOR_FAME: CardStatus[] = ["kingdom", "permanent"];

export function blankCard(serial: number, round: number, patch: Partial<CardRecord> = {}): CardRecord {
  return {
    id: newId(),
    serial,
    name: "",
    type: "friendly",
    keywords: [],
    orientation: "front-top",
    status: "kingdom",
    boosts: {},
    stickers: [],
    checkboxesMarked: 0,
    oneTimeCrossedOut: 0,
    equippedTo: null,
    fame: 0,
    notes: "",
    addedRound: round,
    ...patch,
  };
}

export function cardLabel(card: Pick<CardRecord, "serial" | "name">): string {
  return card.name.trim() ? `#${card.serial} ${card.name.trim()}` : `#${card.serial}`;
}

export function findBySerial(c: Campaign, serial: number): CardRecord | undefined {
  return c.cards.find((k) => k.serial === serial);
}

function validSerial(n: number) {
  return Number.isInteger(n) && n >= 0 && n <= 9999;
}

function sortCards(cards: CardRecord[]) {
  return [...cards].sort((a, b) => a.serial - b.serial);
}

/** Add a card the player discovered. A card that was put back in the box comes back. */
export function addCard(c: Campaign, input: Partial<CardRecord> & { serial: number }): ActionResult {
  if (!validSerial(input.serial)) return fail(c, "Enter the card's serial number.");
  const existing = findBySerial(c, input.serial);
  if (existing && existing.status !== "undiscovered") return fail(c, `#${input.serial} is already in your log.`);
  if (existing) {
    const card: CardRecord = { ...existing, ...input, id: existing.id, status: input.status ?? "kingdom" };
    return ok({ ...c, cards: c.cards.map((k) => (k.id === existing.id ? card : k)) }, `${cardLabel(card)} is back in your kingdom.`);
  }
  const card = blankCard(input.serial, c.round.number, input);
  return ok({ ...c, cards: sortCards([...c.cards, card]) }, `Logged ${cardLabel(card)}.`);
}

/** Log stubs for the starting kingdom (serial numbers only; you fill in the rest). */
export function addStartingKingdom(c: Campaign): ActionResult {
  const missing: number[] = [];
  for (let s = STARTING_KINGDOM.first; s <= STARTING_KINGDOM.last; s++) if (!findBySerial(c, s)) missing.push(s);
  if (missing.length === 0) return fail(c, `Cards ${STARTING_KINGDOM.first}–${STARTING_KINGDOM.last} are already in your log.`);
  const cards = sortCards([...c.cards, ...missing.map((s) => blankCard(s, 1))]);
  return ok({ ...c, cards }, `Added ${missing.length} starting card${missing.length === 1 ? "" : "s"}. Tap each to fill it in.`);
}

/** Holders take their equipment with them when destroyed or purged (it counts as the same card). */
function cascade(cards: CardRecord[], holderId: string, status: CardStatus): CardRecord[] {
  if (status !== "destroyed" && status !== "purged") return cards;
  const equipped = cards.filter((k) => k.equippedTo === holderId && k.status !== status);
  let out = cards.map((k) => (k.equippedTo === holderId ? { ...k, status } : k));
  for (const e of equipped) out = cascade(out, e.id, status);
  return out;
}

export function updateCard(c: Campaign, id: string, patch: Partial<CardRecord>): ActionResult {
  const card = c.cards.find((k) => k.id === id);
  if (!card) return fail(c, "That card is no longer in your log.");
  if (patch.serial !== undefined && patch.serial !== card.serial) {
    if (!validSerial(patch.serial)) return fail(c, "Enter the card's serial number.");
    if (findBySerial(c, patch.serial)) return fail(c, `#${patch.serial} is already in your log.`);
  }
  if (patch.equippedTo) {
    if (patch.equippedTo === id) return fail(c, "A card can't be equipped to itself.");
    // No loops: the holder can't be (indirectly) equipped to this card.
    let h = c.cards.find((k) => k.id === patch.equippedTo);
    while (h) {
      if (h.equippedTo === id) return fail(c, "That would equip the two cards to each other.");
      h = h.equippedTo ? c.cards.find((k) => k.id === h!.equippedTo) : undefined;
    }
  }
  for (const key of ["fame", "checkboxesMarked", "oneTimeCrossedOut"] as const) {
    const v = patch[key];
    if (v !== undefined && !Number.isFinite(v)) return fail(c, "Numbers only, please.");
  }
  const updated: CardRecord = {
    ...card,
    ...patch,
    checkboxesMarked: Math.max(0, patch.checkboxesMarked ?? card.checkboxesMarked),
    oneTimeCrossedOut: Math.max(0, patch.oneTimeCrossedOut ?? card.oneTimeCrossedOut),
  };
  let cards = c.cards.map((k) => (k.id === id ? updated : k));
  const notices: string[] = [];
  if (patch.status && patch.status !== card.status) {
    const before = cards.filter((k) => k.status === patch.status).length;
    cards = cascade(cards, id, patch.status);
    const extra = cards.filter((k) => k.status === patch.status).length - before;
    if (extra > 0) notices.push(`Its equipment (${extra}) was ${patch.status} with it.`);
  }
  return { campaign: { ...c, cards: sortCards(cards) }, notices };
}

/** Remove a log entry entered by mistake. (To record a card leaving play, change its status instead.) */
export function deleteCard(c: Campaign, id: string): ActionResult {
  const card = c.cards.find((k) => k.id === id);
  if (!card) return fail(c, "That card is no longer in your log.");
  const cards = c.cards
    .filter((k) => k.id !== id)
    .map((k) => (k.equippedTo === id ? { ...k, equippedTo: null } : k));
  return ok({ ...c, cards }, `Removed ${cardLabel(card)} from the log.`);
}

export function totalBoosts(card: CardRecord): number {
  return Object.values(card.boosts).reduce((a, b) => a + b, 0);
}

export function adjustBoost(c: Campaign, id: string, resourceId: string, delta: number): ActionResult {
  const card = c.cards.find((k) => k.id === id);
  if (!card) return fail(c, "That card is no longer in your log.");
  const n = Math.max(0, (card.boosts[resourceId] ?? 0) + delta);
  const boosts = { ...card.boosts, [resourceId]: n };
  if (n === 0) delete boosts[resourceId];
  return updateCard(c, id, { boosts });
}

// ---------- Fame and score ----------

export function kingdomFame(c: Campaign): number {
  return c.cards.filter((k) => COUNTS_FOR_FAME.includes(k.status)).reduce((sum, k) => sum + k.fame, 0);
}

export function purgedFame(c: Campaign): number {
  return c.purges.reduce((sum, p) => sum + p.fame, 0) + c.purgedFameAdjust;
}

export function scorePreview(c: Campaign): { kingdom: number; purged: number; total: number } {
  const kingdom = kingdomFame(c);
  const purged = purgedFame(c);
  return { kingdom, purged, total: kingdom + purged };
}

// ---------- Filters ----------

export interface CardFilter {
  status: CardStatus | "all";
  type: CardType | "all";
  query: string;
}

export function filterCards(cards: CardRecord[], f: CardFilter): CardRecord[] {
  const q = f.query.trim().toLowerCase().replace(/^#/, "");
  return cards.filter((k) => {
    if (f.status !== "all" && k.status !== f.status) return false;
    if (f.type !== "all" && k.type !== f.type) return false;
    if (!q) return true;
    if (/^\d+$/.test(q)) return String(k.serial) === q || k.name.toLowerCase().includes(q);
    return k.name.toLowerCase().includes(q) || k.notes.toLowerCase().includes(q) || k.keywords.some((w) => w.toLowerCase().includes(q));
  });
}

/** Cards that can be counted in the deck at the start of a round (not permanent, not gone). */
export function shuffledCardCount(c: Campaign): number {
  return c.cards.filter((k) => k.status === "kingdom" && !k.equippedTo).length;
}
