import { FINAL_CARD, RESET_CARD, STARTING_KINGDOM } from "./defaults";
import { blankCard, cardLabel, findBySerial } from "./kingdom";
import { updateCurrentRecord, type ActionResult } from "./turn";
import type { Campaign, CardRecord } from "./types";

const ok = (campaign: Campaign, ...notices: string[]): ActionResult => ({ campaign, notices });
const fail = (campaign: Campaign, error: string): ActionResult => ({ campaign, notices: [], error });

/** Every serial number that has left the box at some point (starting kingdom included). */
export function everDiscovered(c: Campaign): Set<number> {
  const s = new Set<number>();
  for (let n = STARTING_KINGDOM.first; n <= STARTING_KINGDOM.last; n++) s.add(n);
  for (const r of c.rounds) r.discovered.forEach((n) => s.add(n));
  for (const k of c.cards) s.add(k.serial);
  return s;
}

/** Serials that are out of the box right now (discovered and not put back). */
export function outOfBox(c: Campaign): Set<number> {
  const s = everDiscovered(c);
  for (const k of c.cards) if (k.status === "undiscovered") s.delete(k.serial);
  return s;
}

/** The next cards in serial order still in the box, starting at the counter. Never past the final card. */
export function upcoming(c: Campaign, count = 2): number[] {
  const out = outOfBox(c);
  const result: number[] = [];
  for (let n = c.nextSerial; n <= FINAL_CARD && result.length < count; n++) if (!out.has(n)) result.push(n);
  return result;
}

export function resetWindowOpen(c: Campaign): boolean {
  return !everDiscovered(c).has(RESET_CARD);
}

/** Cards still in the box before the final card (the final card itself included). */
export function cardsUntilFinal(c: Campaign): number {
  if (everDiscovered(c).has(FINAL_CARD)) return 0;
  const out = outOfBox(c);
  let n = 0;
  for (let s = c.nextSerial; s <= FINAL_CARD; s++) if (!out.has(s)) n++;
  return n;
}

export function currentRecord(c: Campaign) {
  return c.rounds.find((r) => r.number === c.round.number) ?? null;
}

export function discoveryPending(c: Campaign): boolean {
  return currentRecord(c)?.discovery === "pending";
}

function withCards(c: Campaign, serials: number[], parchmentFirst: boolean): Campaign {
  let cards: CardRecord[] = [...c.cards];
  serials.forEach((serial, i) => {
    const parchment = parchmentFirst && i === 0;
    const patch: Partial<CardRecord> = parchment ? { type: "parchment", status: "destroyed" } : { status: "kingdom" };
    const existing = cards.find((k) => k.serial === serial);
    if (existing) cards = cards.map((k) => (k.id === existing.id ? { ...k, ...patch } : k));
    else cards.push(blankCard(serial, c.round.number, patch));
  });
  return { ...c, cards: cards.sort((a, b) => a.serial - b.serial) };
}

function markFinal(c: Campaign, serials: number[]): Campaign {
  return serials.includes(FINAL_CARD) && c.finalRound === null && !c.activeExpansionId ? { ...c, finalRound: c.round.number } : c;
}

/**
 * Start-of-round discovery. If the first card is a parchment card, only that card is
 * discovered: you follow it and destroy it.
 */
export function confirmDiscovery(c: Campaign, parchmentFirst: boolean): ActionResult {
  if (!discoveryPending(c)) return fail(c, "This round's discovery is already done.");
  const next = upcoming(c, 2);
  if (next.length === 0) return fail(c, "There's nothing left to discover in order. Check the counter.");
  const serials = parchmentFirst ? next.slice(0, 1) : next;
  let out = updateCurrentRecord(c, (r) => ({ ...r, discovered: serials, parchment: parchmentFirst, discovery: "done" }));
  out = withCards(out, serials, parchmentFirst);
  out = { ...out, nextSerial: serials[serials.length - 1] + 1 };
  out = markFinal(out, serials);
  const notices = parchmentFirst
    ? [`#${serials[0]} is a parchment card: follow its instructions, then destroy it.`]
    : [`Discovered ${serials.map((s) => "#" + s).join(" and ")}. Add them to your discard pile.`];
  if (parchmentFirst && resetWindowOpen(out)) notices.push(`Before #${RESET_CARD}: set destroyed cards aside.`);
  if (out.finalRound === out.round.number && c.finalRound === null) notices.push("FINAL ROUND: this is the last round of the game.");
  notices.push("Then shuffle all your cards (not permanent ones) into a new deck and count it.");
  return { campaign: out, notices };
}

export function skipDiscovery(c: Campaign): ActionResult {
  if (!discoveryPending(c)) return fail(c, "This round's discovery is already done.");
  return ok(updateCurrentRecord(c, (r) => ({ ...r, discovery: "skipped" })), "No discovery this round.");
}

/** Reopen the current round's discovery (to fix a mistake) without touching the log. */
export function reopenDiscovery(c: Campaign): ActionResult {
  const r = currentRecord(c);
  if (!r || r.discovery === "pending") return fail(c, "Nothing to reopen.");
  return ok(updateCurrentRecord(c, (x) => ({ ...x, discovery: "pending", discovered: [], parchment: false })), "Discovery reopened.");
}

export function setNextSerial(c: Campaign, n: number): ActionResult {
  if (!Number.isInteger(n) || n < 0) return fail(c, "Enter a card number.");
  return ok({ ...c, nextSerial: n }, `Next discovery starts at #${n}.`);
}

/** A card effect discovered a specific card (outside the start-of-round discovery). */
export function discoverByEffect(c: Campaign, serial: number): ActionResult {
  if (!Number.isInteger(serial) || serial < 0) return fail(c, "Enter the card's serial number.");
  const existing = findBySerial(c, serial);
  if (existing && existing.status !== "undiscovered") return fail(c, `${cardLabel(existing)} is already in your log.`);
  let out = withCards(c, [serial], false);
  out = markFinal(out, [serial]);
  const notices = [`Discovered #${serial}. Add it to your discard pile.`];
  if (out.finalRound !== c.finalRound) notices.push("FINAL ROUND: this is the last round of the game.");
  return { campaign: out, notices };
}

/** Manually set or clear the final round (e.g. if you started using the app mid-game). */
export function setFinalRound(c: Campaign, isFinal: boolean): ActionResult {
  return ok({ ...c, finalRound: isFinal ? c.round.number : null }, isFinal ? "Marked as the final round." : "Final round cleared.");
}

export function setRoundNotes(c: Campaign, round: number, notes: string): Campaign {
  return { ...c, rounds: c.rounds.map((r) => (r.number === round ? { ...r, notes } : r)) };
}
