import {
  CARDS_PER_ADVANCE,
  CARDS_PER_TURN,
  END_OF_ROUND_STEPS,
  END_OF_TURN_STEPS,
  freshRound,
  freshTurn,
  newId,
  roundRecord,
  zeroCounts,
} from "./defaults";
import type { Campaign, RoundRecord, TurnEnd } from "./types";

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

/** Apply a change to the history record of the current round (creating it if missing). */
export function updateCurrentRecord(c: Campaign, fn: (r: RoundRecord) => RoundRecord): Campaign {
  const n = c.round.number;
  const exists = c.rounds.some((r) => r.number === n);
  const rounds = exists
    ? c.rounds.map((r) => (r.number === n ? fn(r) : r))
    : [...c.rounds, fn(roundRecord(n, "none", c.activeExpansionId))];
  return { ...c, rounds };
}

export function activeExpansion(c: Campaign) {
  return c.expansions.find((e) => e.id === c.activeExpansionId && e.status === "playing") ?? null;
}

/** Is the current round the last one (card #70 found, or an expansion's last planned round)? */
export function isFinalRound(c: Campaign): boolean {
  const exp = activeExpansion(c);
  if (exp) return exp.roundsPlanned !== null && c.round.number >= exp.startRound + exp.roundsPlanned - 1;
  return c.finalRound !== null && c.round.number >= c.finalRound;
}

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
  const next = updateCurrentRecord({ ...c, round }, (r) => ({ ...r, deckSize: round.deckSize }));
  return ok(next, `Deck: ${count} card${count === 1 ? "" : "s"}.`);
}

/** A card effect put a card on the deck (+1) or took one from it (-1). */
export function adjustDeck(c: Campaign, delta: number): ActionResult {
  if (c.round.deckRemaining === null) return fail(c, "Count the deck first.");
  const deckRemaining = c.round.deckRemaining + delta;
  if (deckRemaining < 0) return fail(c, "The deck is already empty.");
  return ok({ ...c, round: { ...c.round, deckRemaining } }, `Deck: ${deckRemaining} card${deckRemaining === 1 ? "" : "s"}.`);
}

function clearedNotice(c: Campaign, reason: string): string {
  return hasAnyResources(c) ? `Resources cleared: ${reason}.` : `${reason[0].toUpperCase()}${reason.slice(1)}.`;
}

// ---------- Turn ----------

export function canStartTurn(c: Campaign): string | null {
  if (c.gameOver) return "The game is over. See the Campaign tab.";
  if (c.turn.active) return "Finish this turn first: upgrade a card or pass.";
  if (c.round.over) return "The round is over. Start the next round.";
  if (c.round.deckRemaining === 0) return "The deck is empty. End the round.";
  return null;
}

export function startTurn(c: Campaign): ActionResult {
  const blocked = canStartTurn(c);
  if (blocked) return fail(c, blocked);
  const { campaign, drawn } = drawFromDeck(clearResources(c), CARDS_PER_TURN);
  const number = c.turn.number + 1;
  const next: Campaign = updateCurrentRecord(
    { ...campaign, turn: { ...freshTurn(), number, active: true, cardsPlayed: drawn } },
    (r) => ({ ...r, turns: number }),
  );
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
  const label = how === "upgrade" ? "upgraded a card" : how === "time" ? "time effect" : "passed";
  const notices = [clearedNotice(c, `turn ended (${label})`)];
  if (deckEmpty) {
    notices.push(
      isFinalRound(c)
        ? "The deck is empty: this was the final round."
        : "The deck is empty: this round ends after the end-of-turn steps.",
    );
  }
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
  if (c.gameOver) return fail(c, "The game is over. Start an expansion from the Campaign tab.");
  if (!c.round.over) return fail(c, "The round isn't over yet.");
  if (isFinalRound(c)) {
    return fail(c, activeExpansion(c) ? "That was the expansion's last round. Finish it on the Campaign tab." : "That was the final round. Finish the game.");
  }
  const number = c.round.number + 1;
  const exp = activeExpansion(c);
  const discovery = exp && !exp.discoversCards ? "none" : "pending";
  const next: Campaign = {
    ...clearResources(c),
    round: freshRound(number),
    turn: freshTurn(),
    rounds: [...c.rounds.filter((r) => r.number !== number), roundRecord(number, discovery, c.activeExpansionId)],
  };
  return ok(
    next,
    discovery === "pending"
      ? `Round ${number} started. Discover new cards, then shuffle and count your deck.`
      : `Round ${number} started. Shuffle and count your deck.`,
  );
}

/** After the final round: the game (or expansion chapter) is over and it's time to score. */
export function finishGame(c: Campaign): ActionResult {
  if (c.turn.active) return fail(c, "Finish this turn first.");
  if (c.gameOver) return fail(c, "The game is already over.");
  return ok({ ...clearResources(c), round: { ...c.round, over: true }, gameOver: true }, "Game over. Count your fame on the Campaign tab.");
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
