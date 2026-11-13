export interface ResourceDef {
  id: string;
  name: string;
  icon: string;
  /** Built-in resources from the base game cannot be removed. */
  builtin: boolean;
}

export type TurnEnd = "upgrade" | "pass";

export interface TurnState {
  /** Turns started this round (0 before the first turn). */
  number: number;
  /** True between "New turn" and "Upgrade"/"Pass". */
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
  /** True once a turn ended with an empty deck. */
  over: boolean;
  /** Ticks for the end-of-round checklist (same order as END_OF_ROUND_STEPS). */
  checklist: boolean[];
}

export interface Campaign {
  id: string;
  name: string;
  createdAt: string;
  resources: ResourceDef[];
  counts: Record<string, number>;
  round: RoundState;
  turn: TurnState;
}

/** Everything that undo/redo covers and that the backup file contains. */
export interface LedgerState {
  schemaVersion: 1;
  campaigns: Campaign[];
  activeId: string;
}

export type Theme = "dark" | "light";
