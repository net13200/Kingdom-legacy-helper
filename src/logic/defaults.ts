import type { Campaign, LedgerState, ResourceDef, RoundState, TurnState } from "./types";

export const BASE_RESOURCES: ResourceDef[] = [
  { id: "coin", name: "Coin", icon: "🪙", builtin: true },
  { id: "metal", name: "Metal", icon: "🔩", builtin: true },
  { id: "wood", name: "Wood", icon: "🪵", builtin: true },
  { id: "stone", name: "Stone", icon: "🪨", builtin: true },
  { id: "sword", name: "Sword", icon: "⚔️", builtin: true },
  { id: "trade", name: "Trade Good", icon: "📦", builtin: true },
];

export const END_OF_TURN_STEPS = [
  "Resolve end-of-turn effects",
  "Discard all cards in play, except cards that stay in play",
  "Deck has cards: start a new turn. Deck empty: end the round",
] as const;

export const END_OF_ROUND_STEPS = [
  "Discard everything, including cards that stay in play",
  "Resolve end-of-round effects",
  "Shuffle the deck and start the next round",
] as const;

export const CARDS_PER_TURN = 4;
export const CARDS_PER_ADVANCE = 2;

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
    createdAt: now.toISOString(),
    resources,
    counts: zeroCounts(resources),
    round: freshRound(1),
    turn: freshTurn(),
  };
}

export function newLedger(): LedgerState {
  const campaign = newCampaign();
  return { schemaVersion: 1, campaigns: [campaign], activeId: campaign.id };
}
