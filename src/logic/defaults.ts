import type { Campaign, LedgerState, ResourceDef, RoundRecord, RoundState, TurnState } from "./types";

export const BASE_RESOURCES: ResourceDef[] = [
  { id: "coin", name: "Coin", icon: "🪙", builtin: true },
  { id: "metal", name: "Metal", icon: "🔩", builtin: true },
  { id: "wood", name: "Wood", icon: "🪵", builtin: true },
  { id: "stone", name: "Stone", icon: "🪨", builtin: true },
  { id: "sword", name: "Sword", icon: "⚔️", builtin: true },
  { id: "trade", name: "Trade Good", icon: "📦", builtin: true },
];

/** Keyword colours from the rule sheet. Negative cards are red. */
export const KEYWORDS = ["Building", "Land", "Person", "Livestock", "Seafaring", "Other", "Enemy", "Event"] as const;

export const END_OF_TURN_STEPS = [
  "Resolve end-of-turn effects",
  "Discard all cards in play, except cards that stay in play (blocked cards go with their blocker)",
  "Deck has cards: start a new turn. Deck empty: end the round",
] as const;

export const END_OF_ROUND_STEPS = [
  "Discard all cards, even cards that stay in play",
  "Resolve end-of-round effects",
] as const;

export const EXPANSION_PREP_STEPS = ["Perform a purge 12", "Purge 1 permanent card"] as const;

export const STARTING_KINGDOM = { first: 1, last: 10 };
export const FIRST_DISCOVERY = 11;
export const RESET_CARD = 23;
export const FINAL_CARD = 70;
export const MAX_EXPANSIONS = 10;
export const PURGE_GROUP = 12;
export const MAX_PRODUCTION_FOR_STICKER = 9;
export const CARDS_PER_TURN = 4;
export const CARDS_PER_ADVANCE = 2;
export const UNDO_STEPS_SAVED = 30;

export function freshTurn(): TurnState {
  return {
    number: 0,
    active: false,
    cardsPlayed: 0,
    advances: 0,
    ended: null,
    checklist: END_OF_TURN_STEPS.map(() => false),
  };
}

export function freshRound(number: number): RoundState {
  return {
    number,
    deckSize: null,
    deckRemaining: null,
    over: false,
    checklist: END_OF_ROUND_STEPS.map(() => false),
  };
}

export function roundRecord(number: number, discovery: RoundRecord["discovery"], expansionId: string | null = null): RoundRecord {
  return { number, discovered: [], parchment: false, discovery, turns: 0, deckSize: null, notes: "", expansionId };
}

export function zeroCounts(resources: ResourceDef[]): Record<string, number> {
  return Object.fromEntries(resources.map((r) => [r.id, 0]));
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function newCampaign(name = "My kingdom", id = newId(), now = new Date()): Campaign {
  const resources = BASE_RESOURCES.map((r) => ({ ...r }));
  return {
    id,
    name,
    kingdomCode: "",
    createdAt: now.toISOString(),
    resources,
    counts: zeroCounts(resources),
    round: freshRound(1),
    turn: freshTurn(),
    rounds: [roundRecord(1, "none")],
    nextSerial: FIRST_DISCOVERY,
    finalRound: null,
    gameOver: false,
    cards: [],
    purges: [],
    purgedFameAdjust: 0,
    baseScore: null,
    expansions: [],
    activeExpansionId: null,
  };
}

export function newLedger(): LedgerState {
  const campaign = newCampaign();
  return { schemaVersion: 2, campaigns: [campaign], activeId: campaign.id };
}
