import {
  CARDS_PER_ADVANCE,
  CARDS_PER_TURN,
  END_OF_ROUND_STEPS,
  END_OF_TURN_STEPS,
  freshRound,
  freshTurn,
  newId,
  zeroCounts,
} from "./defaults";
import type { Campaign, TurnEnd } from "./types";

/**
 * Every game action is a pure function: Campaign in, ActionResult out.
 * `notices` are short messages for the toast; `error` means nothing changed.
 */
export interface ActionResult {
  campaign: Campaign;
  notices: string[];
  error?: string;
}

const ok = (campaign: Campaign, ...notices: string[]): ActionResult => ({ campaign, notices });
const fail = (campaign: Campaign, error: string): ActionResult => ({ campaign, notices: [], error });

export const LAST_TURN_WARNING = "Last turn of the round: the deck is empty.";

// ---------- Resources ----------

export function hasAnyResources(c: Campaign): boolean {
  return Object.values(c.counts).some((n) => n > 0);
}

/** All resources back to 0. */
export function clearResources(c: Campaign): Campaign {
  return { ...c, counts: zeroCounts(c.resources) };
}

export function adjustResource(c: Campaign, id: string, delta: number): Campaign {
  if (!c.resources.some((r) => r.id === id)) return c;
  const next = Math.max(0, (c.counts[id] ?? 0) + delta);
  return { ...c, counts: { ...c.counts, [id]: next } };
}

export function addResource(c: Campaign, name: string, icon: string, id = newId()): ActionResult {
  const clean = name.trim();
  if (!clean) return fail(c, "Give the resource a name.");
  if (c.resources.some((r) => r.name.toLowerCase() === clean.toLowerCase())) {
    return fail(c, `"${clean}" is already on the list.`);
  }
  const resource = { id, name: clean, icon: icon.trim() || "✦", builtin: false };
  return ok(
    { ...c, resources: [...c.resources, resource], counts: { ...c.counts, [id]: 0 } },
    `Added ${clean}.`,
  );
}

export function removeResource(c: Campaign, id: string): ActionResult {
  const resource = c.resources.find((r) => r.id === id);
  if (!resource) return fail(c, "That resource no longer exists.");
  if (resource.builtin) return fail(c, `${resource.name} is a base-game resource and can't be removed.`);
  const counts = { ...c.counts };
  delete counts[id];
  return ok({ ...c, resources: c.resources.filter((r) => r.id !== id), counts }, `Removed ${resource.name}.`);
}

// ---------- Deck ----------

/** How many cards a draw of `want` actually brings in. Unknown deck size: assume enough. */
export function cardsToDraw(deckRemaining: number | null, want: number): number {
  if (deckRemaining === null) return want;
  return Math.max(0, Math.min(want, deckRemaining));
}

function drawFromDeck(c: Campaign, want: number): { campaign: Campaign; drawn: number } {
  const drawn = cardsToDraw(c.round.deckRemaining, want);
  const deckRemaining = c.round.deckRemaining === null ? null : c.round.deckRemaining - drawn;
  return { campaign: { ...c, round: { ...c.round, deckRemaining } }, drawn };
}

/** Player counted the deck. Before the first turn of a round this is also the round's deck size. */
export function setDeckCount(c: Campaign, count: number): ActionResult {
  if (!Number.isInteger(count) || count < 0) return fail(c, "Enter a whole number of cards (0 or more).");
  const roundStarted = c.turn.number > 0;
  const round = {
    ...c.round,
    deckRemaining: count,
    deckSize: roundStarted ? c.round.deckSize ?? count : count,
  };
  return ok({ ...c, round }, `Deck: ${count} card${count === 1 ? "" : "s"}.`);
}

function clearedNotice(c: Campaign, reason: string): string {
  return hasAnyResources(c) ? `Resources cleared: ${reason}.` : `${reason[0].toUpperCase()}${reason.slice(1)}.`;
}

// ---------- Turn ----------

export function canStartTurn(c: Campaign): string | null {
  if (c.turn.active) return "Finish this turn first: upgrade a card or pass.";
  if (c.round.over) return "The round is over. Start the next round.";
  if (c.round.deckRemaining === 0) return "The deck is empty. End the round.";
  return null;
}

export function startTurn(c: Campaign): ActionResult {
  const blocked = canStartTurn(c);
  if (blocked) return fail(c, blocked);
  const { campaign, drawn } = drawFromDeck(clearResources(c), CARDS_PER_TURN);
  const next: Campaign = {
    ...campaign,
    turn: {
      ...freshTurn(),
      number: c.turn.number + 1,
      active: true,
      cardsPlayed: drawn,
    },
  };
  const notices = [clearedNotice(c, `${drawn} new card${drawn === 1 ? "" : "s"} entered play`)];
  if (next.round.deckRemaining === 0) notices.push(LAST_TURN_WARNING);
  return { campaign: next, notices };
}

export function canAdvance(c: Campaign): string | null {
  if (!c.turn.active) return "Start a turn first.";
  if (c.round.deckRemaining === 0) return "The deck is empty: you can't advance.";
  return null;
}

export function advance(c: Campaign): ActionResult {
  const blocked = canAdvance(c);
  if (blocked) return fail(c, blocked);
  const { campaign, drawn } = drawFromDeck(clearResources(c), CARDS_PER_ADVANCE);
  const next: Campaign = {
    ...campaign,
    turn: { ...c.turn, cardsPlayed: c.turn.cardsPlayed + drawn, advances: c.turn.advances + 1 },
  };
  const notices = [clearedNotice(c, `advanced, ${drawn} new card${drawn === 1 ? "" : "s"} entered play`)];
  if (next.round.deckRemaining === 0) notices.push(LAST_TURN_WARNING);
  return { campaign: next, notices };
}

export function endTurn(c: Campaign, how: TurnEnd): ActionResult {
  if (!c.turn.active) return fail(c, "No turn is running.");
  const deckEmpty = c.round.deckRemaining === 0;
  const next: Campaign = {
    ...clearResources(c),
    turn: { ...c.turn, active: false, ended: how, checklist: END_OF_TURN_STEPS.map(() => false) },
    round: { ...c.round, over: deckEmpty },
  };
  const label = how === "upgrade" ? "upgraded a card" : "passed";
  const notices = [clearedNotice(c, `turn ended (${label})`)];
  if (deckEmpty) notices.push("The deck is empty: this round ends after the end-of-turn steps.");
  return { campaign: next, notices };
}

/** Manually end the round (e.g. the deck count was off). */
export function endRound(c: Campaign): ActionResult {
  if (c.turn.active) return fail(c, "Finish this turn first: upgrade a card or pass.");
  if (c.round.over) return fail(c, "The round is already over.");
  return ok({ ...clearResources(c), round: { ...c.round, over: true } }, `Round ${c.round.number} ended.`);
}

export function startNextRound(c: Campaign): ActionResult {
  if (c.turn.active) return fail(c, "Finish this turn first: upgrade a card or pass.");
  if (!c.round.over) return fail(c, "The round isn't over yet.");
  const number = c.round.number + 1;
  return ok(
    { ...clearResources(c), round: freshRound(number), turn: freshTurn() },
    `Round ${number} started. Count your deck.`,
  );
}

// ---------- Checklists ----------

export function toggleTurnStep(c: Campaign, index: number): Campaign {
  if (index < 0 || index >= END_OF_TURN_STEPS.length) return c;
  const checklist = c.turn.checklist.map((v, i) => (i === index ? !v : v));
  return { ...c, turn: { ...c.turn, checklist } };
}

export function toggleRoundStep(c: Campaign, index: number): Campaign {
  if (index < 0 || index >= END_OF_ROUND_STEPS.length) return c;
  const checklist = c.round.checklist.map((v, i) => (i === index ? !v : v));
  return { ...c, round: { ...c.round, checklist } };
}
