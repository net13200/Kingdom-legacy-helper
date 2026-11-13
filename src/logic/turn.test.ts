import { describe, expect, it } from "vitest";
import { newCampaign } from "./defaults";
import {
  addResource,
  adjustResource,
  advance,
  cardsToDraw,
  clearResources,
  endRound,
  endTurn,
  LAST_TURN_WARNING,
  removeResource,
  setDeckCount,
  startNextRound,
  startTurn,
  toggleTurnStep,
} from "./turn";
import type { Campaign } from "./types";

const fresh = () => newCampaign("Test", "c1", new Date("2026-01-01"));
const withDeck = (n: number) => setDeckCount(fresh(), n).campaign;
const rich = (c: Campaign) => adjustResource(adjustResource(c, "coin", 3), "wood", 2);

describe("resources", () => {
  it("never goes below zero", () => {
    expect(adjustResource(fresh(), "coin", -1).counts.coin).toBe(0);
    expect(adjustResource(fresh(), "coin", 2).counts.coin).toBe(2);
  });

  it("ignores unknown resources", () => {
    const c = fresh();
    expect(adjustResource(c, "nope", 1)).toBe(c);
  });

  it("clear all sets every resource to 0", () => {
    const c = clearResources(rich(fresh()));
    expect(Object.values(c.counts).every((n) => n === 0)).toBe(true);
  });

  it("adds and removes custom resources, but not base ones", () => {
    const added = addResource(fresh(), "Grain", "🌾", "grain").campaign;
    expect(added.resources.at(-1)).toMatchObject({ id: "grain", name: "Grain", builtin: false });
    expect(added.counts.grain).toBe(0);
    expect(addResource(added, "grain", "").error).toBeTruthy();
    expect(addResource(added, "  ", "").error).toBeTruthy();
    const removed = removeResource(added, "grain").campaign;
    expect(removed.resources.some((r) => r.id === "grain")).toBe(false);
    expect("grain" in removed.counts).toBe(false);
    expect(removeResource(fresh(), "coin").error).toBeTruthy();
  });
});

describe("deck counting", () => {
  it("draws up to the requested number", () => {
    expect(cardsToDraw(null, 4)).toBe(4);
    expect(cardsToDraw(10, 4)).toBe(4);
    expect(cardsToDraw(3, 4)).toBe(3);
    expect(cardsToDraw(0, 2)).toBe(0);
  });

  it("subtracts 4 per turn and 2 per advance", () => {
    let c = withDeck(12);
    c = startTurn(c).campaign;
    expect(c.round.deckRemaining).toBe(8);
    c = advance(c).campaign;
    expect(c.round.deckRemaining).toBe(6);
    expect(c.turn).toMatchObject({ cardsPlayed: 6, advances: 1, active: true });
  });

  it("plays all remaining cards when fewer than 4 are left, and warns", () => {
    const r = startTurn(withDeck(3));
    expect(r.campaign.turn.cardsPlayed).toBe(3);
    expect(r.campaign.round.deckRemaining).toBe(0);
    expect(r.notices).toContain(LAST_TURN_WARNING);
  });

  it("warns when an advance empties the deck, and blocks further advances", () => {
    let c = startTurn(withDeck(6)).campaign;
    const r = advance(c);
    expect(r.notices).toContain(LAST_TURN_WARNING);
    c = r.campaign;
    expect(advance(c).error).toBeTruthy();
  });

  it("works without a deck count", () => {
    const c = startTurn(fresh()).campaign;
    expect(c.round.deckRemaining).toBeNull();
    expect(c.turn.cardsPlayed).toBe(4);
  });

  it("records deck size only before the first turn", () => {
    let c = withDeck(20);
    expect(c.round.deckSize).toBe(20);
    c = startTurn(c).campaign;
    c = setDeckCount(c, 15).campaign;
    expect(c.round).toMatchObject({ deckSize: 20, deckRemaining: 15 });
    expect(setDeckCount(c, -1).error).toBeTruthy();
    expect(setDeckCount(c, 2.5).error).toBeTruthy();
  });
});

describe("resources clear when cards enter play or the turn ends", () => {
  it("on new turn", () => {
    const r = startTurn(rich(withDeck(10)));
    expect(Object.values(r.campaign.counts).every((n) => n === 0)).toBe(true);
    expect(r.notices[0]).toMatch(/Resources cleared/);
  });

  it("on advance", () => {
    const c = rich(startTurn(withDeck(10)).campaign);
    const r = advance(c);
    expect(r.campaign.counts.coin).toBe(0);
    expect(r.notices[0]).toMatch(/Resources cleared/);
  });

  it.each(["upgrade", "pass"] as const)("on %s", (how) => {
    const c = rich(startTurn(withDeck(10)).campaign);
    const r = endTurn(c, how);
    expect(r.campaign.counts.wood).toBe(0);
    expect(r.campaign.turn).toMatchObject({ active: false, ended: how });
  });

  it("does not claim to clear when nothing was held", () => {
    expect(startTurn(withDeck(10)).notices[0]).not.toMatch(/Resources cleared/);
  });
});

describe("turn flow", () => {
  it("cannot start a turn while one is running", () => {
    const c = startTurn(withDeck(10)).campaign;
    expect(startTurn(c).error).toBeTruthy();
  });

  it("cannot advance or end without a turn", () => {
    expect(advance(fresh()).error).toBeTruthy();
    expect(endTurn(fresh(), "pass").error).toBeTruthy();
  });

  it("counts turns and resets the checklist on a new turn", () => {
    let c = startTurn(withDeck(10)).campaign;
    c = endTurn(c, "pass").campaign;
    c = toggleTurnStep(c, 0);
    expect(c.turn.checklist[0]).toBe(true);
    c = startTurn(c).campaign;
    expect(c.turn.number).toBe(2);
    expect(c.turn.checklist.every((v) => !v)).toBe(true);
  });

  it("ends the round when a turn ends with an empty deck", () => {
    let c = startTurn(withDeck(4)).campaign;
    c = endTurn(c, "pass").campaign;
    expect(c.round.over).toBe(true);
    expect(startTurn(c).error).toBeTruthy();
    const next = startNextRound(c).campaign;
    expect(next.round).toMatchObject({ number: 2, deckRemaining: null, over: false });
    expect(next.turn.number).toBe(0);
  });

  it("can end a round by hand, but not mid-turn", () => {
    const running = startTurn(withDeck(10)).campaign;
    expect(endRound(running).error).toBeTruthy();
    const ended = endRound(endTurn(running, "pass").campaign).campaign;
    expect(ended.round.over).toBe(true);
    expect(startNextRound(withDeck(10)).error).toBeTruthy();
  });

  it("never mutates its input", () => {
    const c = rich(withDeck(10));
    const snapshot = JSON.stringify(c);
    startTurn(c);
    advance(startTurn(c).campaign);
    expect(JSON.stringify(c)).toBe(snapshot);
  });
});
