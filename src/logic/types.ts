export interface ResourceDef {
  id: string;
  name: string;
  icon: string;
  /** Built-in resources from the base game cannot be removed. */
  builtin: boolean;
}

/** Upgrade, pass, or a time effect (discard a card and end the turn). */
export type TurnEnd = "upgrade" | "pass" | "time";

export interface TurnState {
  /** Turns started this round (0 before the first turn). */
  number: number;
  /** True between "New turn" and the action that ends it. */
  active: boolean;
  /** Cards brought into play from the deck this turn. */
  cardsPlayed: number;
  advances: number;
  /** How the last turn ended, or null while a turn is running / none played. */
  ended: TurnEnd | null;
  /** Ticks for the end-of-turn checklist (same order as END_OF_TURN_STEPS). */
  checklist: boolean[];
}

export interface RoundState {
  number: number;
  /** Deck size the player entered at the start of the round. */
  deckSize: number | null;
  /** Cards left in the deck; null until the player enters it. */
  deckRemaining: number | null;
  /** True once a turn ended with an empty deck (or the player ended the round). */
  over: boolean;
  /** Ticks for the end-of-round checklist (same order as END_OF_ROUND_STEPS). */
  checklist: boolean[];
}

/** One line of round history. */
export interface RoundRecord {
  number: number;
  /** Serial numbers discovered at the start of this round. */
  discovered: number[];
  /** Whether the first card of this round's discovery was a parchment card. */
  parchment: boolean;
  /** "pending" until the player confirms or skips the round's discovery. */
  discovery: "pending" | "done" | "skipped" | "none";
  turns: number;
  deckSize: number | null;
  notes: string;
  /** Expansion being played during this round, if any. */
  expansionId: string | null;
}

export type CardType = "friendly" | "enemy" | "event" | "parchment";
export type Orientation = "front-top" | "front-bottom" | "back-top" | "back-bottom";
/** "kingdom" = in your deck, play area or discard pile. "undiscovered" = put back in the box. */
export type CardStatus = "kingdom" | "permanent" | "destroyed" | "purged" | "undiscovered";

export interface StickerNote {
  id: string;
  text: string;
}

export interface CardRecord {
  id: string;
  serial: number;
  name: string;
  type: CardType;
  keywords: string[];
  orientation: Orientation;
  status: CardStatus;
  /** Resource stickers that boost production: resource id -> count. */
  boosts: Record<string, number>;
  /** Any other sticker, described by the player. */
  stickers: StickerNote[];
  checkboxesMarked: number;
  oneTimeCrossedOut: number;
  /** Id of the card this equipment is attached to. */
  equippedTo: string | null;
  fame: number;
  notes: string;
  /** Round in which the card was logged. */
  addedRound: number;
}

export interface PurgeRecord {
  id: string;
  label: string;
  /** Fame of the purged cards (written on the purged-fame sticker). */
  fame: number;
  cardIds: string[];
  round: number;
}

export interface Expansion {
  id: string;
  name: string;
  /** Whether you discover 2 cards from the box at the start of each round. */
  discoversCards: boolean;
  /** Rounds the expansion lasts, if it says (null = until the expansion ends). */
  roundsPlanned: number | null;
  startRound: number;
  status: "playing" | "finished";
  /** Score written on the box's score path after the expansion. */
  score: number | null;
  /** Ticks for "before you play" steps (purge 12, purge 1 permanent). */
  prep: boolean[];
}

export interface Campaign {
  id: string;
  name: string;
  kingdomCode: string;
  createdAt: string;
  resources: ResourceDef[];
  counts: Record<string, number>;
  round: RoundState;
  turn: TurnState;
  rounds: RoundRecord[];
  /** Lowest serial number that could be discovered next from the box. */
  nextSerial: number;
  /** Round in which card #70 was discovered (the final round), if it has been. */
  finalRound: number | null;
  /** True after the final round of the base game (or of an expansion) ends. */
  gameOver: boolean;
  cards: CardRecord[];
  purges: PurgeRecord[];
  /** Hand corrections to purged fame (e.g. from before you used the app). */
  purgedFameAdjust: number;
  baseScore: number | null;
  expansions: Expansion[];
  /** The expansion being played, or null for the base game / between chapters. */
  activeExpansionId: string | null;
}

/** Everything that undo/redo covers and that the backup file contains. */
export interface LedgerState {
  schemaVersion: 2;
  campaigns: Campaign[];
  activeId: string;
}

export type Theme = "dark" | "light";
