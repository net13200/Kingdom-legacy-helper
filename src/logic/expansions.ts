import { EXPANSION_PREP_STEPS, freshRound, freshTurn, MAX_EXPANSIONS, newId, roundRecord } from "./defaults";
import { activeExpansion, clearResources, type ActionResult } from "./turn";
import type { Campaign, Expansion } from "./types";

const ok = (campaign: Campaign, ...notices: string[]): ActionResult => ({ campaign, notices });
const fail = (campaign: Campaign, error: string): ActionResult => ({ campaign, notices: [], error });

export function recordBaseScore(c: Campaign, score: number | null): ActionResult {
  if (score !== null && !Number.isInteger(score)) return fail(c, "Whole numbers only.");
  return ok({ ...c, baseScore: score }, score === null ? "Score cleared." : `Base game score: ${score}. Write it on your box too.`);
}

export function canStartExpansion(c: Campaign): string | null {
  if (activeExpansion(c)) return "Finish the current expansion first.";
  if (!c.gameOver) return "Finish the base game first.";
  if (c.expansions.length >= MAX_EXPANSIONS) return `A kingdom can play at most ${MAX_EXPANSIONS} expansions.`;
  return null;
}

export interface ExpansionInput {
  name: string;
  discoversCards: boolean;
  roundsPlanned: number | null;
}

/** Begin an expansion: it starts a new round of its own. Each expansion can only be played once. */
export function startExpansion(c: Campaign, input: ExpansionInput, id = newId()): ActionResult {
  const blocked = canStartExpansion(c);
  if (blocked) return fail(c, blocked);
  const name = input.name.trim();
  if (!name) return fail(c, "Name the expansion.");
  if (c.expansions.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
    return fail(c, `This kingdom has already played ${name}. Each expansion is played once.`);
  }
  if (input.roundsPlanned !== null && (!Number.isInteger(input.roundsPlanned) || input.roundsPlanned < 1)) {
    return fail(c, "Rounds must be a whole number, or leave it empty.");
  }
  const number = c.round.number + 1;
  const expansion: Expansion = {
    id,
    name,
    discoversCards: input.discoversCards,
    roundsPlanned: input.roundsPlanned,
    startRound: number,
    status: "playing",
    score: null,
    prep: EXPANSION_PREP_STEPS.map(() => false),
  };
  const next: Campaign = {
    ...clearResources(c),
    expansions: [...c.expansions, expansion],
    activeExpansionId: id,
    gameOver: false,
    round: freshRound(number),
    turn: freshTurn(),
    rounds: [...c.rounds, roundRecord(number, input.discoversCards ? "pending" : "none", id)],
  };
  return ok(next, `${name} started. Do the purge steps on the Campaign tab before your first turn.`);
}

export function toggleExpansionPrep(c: Campaign, id: string, index: number): Campaign {
  return {
    ...c,
    expansions: c.expansions.map((e) => (e.id === id ? { ...e, prep: e.prep.map((v, i) => (i === index ? !v : v)) } : e)),
  };
}

export function finishExpansion(c: Campaign, score: number | null): ActionResult {
  const exp = activeExpansion(c);
  if (!exp) return fail(c, "No expansion is being played.");
  if (c.turn.active) return fail(c, "Finish this turn first.");
  if (score !== null && !Number.isInteger(score)) return fail(c, "Whole numbers only.");
  return ok(
    {
      ...clearResources(c),
      expansions: c.expansions.map((e) => (e.id === exp.id ? { ...e, status: "finished", score } : e)),
      activeExpansionId: null,
      gameOver: true,
      round: { ...c.round, over: true },
    },
    `${exp.name} finished.${score !== null ? ` Score ${score}: write it on your box's score path.` : ""}`,
  );
}

export function setExpansionScore(c: Campaign, id: string, score: number | null): ActionResult {
  if (score !== null && !Number.isInteger(score)) return fail(c, "Whole numbers only.");
  return ok({ ...c, expansions: c.expansions.map((e) => (e.id === id ? { ...e, score } : e)) });
}

export function removeExpansion(c: Campaign, id: string): ActionResult {
  const exp = c.expansions.find((e) => e.id === id);
  if (!exp) return fail(c, "That expansion is no longer listed.");
  return ok(
    {
      ...c,
      expansions: c.expansions.filter((e) => e.id !== id),
      activeExpansionId: c.activeExpansionId === id ? null : c.activeExpansionId,
    },
    `Removed ${exp.name} from the list.`,
  );
}
