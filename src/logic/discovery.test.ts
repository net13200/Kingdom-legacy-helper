import { describe, expect, it } from "vitest";
import { newCampaign } from "./defaults";
import {
  cardsUntilFinal,
  confirmDiscovery,
  discoverByEffect,
  discoveryPending,
  everDiscovered,
  reopenDiscovery,
  resetWindowOpen,
  setNextSerial,
  skipDiscovery,
  upcoming,
} from "./discovery";
import { updateCard } from "./kingdom";
import { endTurn, finishGame, isFinalRound, setDeckCount, startNextRound, startTurn } from "./turn";
import type { Campaign } from "./types";

const fresh = () => newCampaign("T", "c1", new Date("2026-01-01"));

/** Play out the current round with a tiny deck and move to the next one. */
function nextRound(c: Campaign): Campaign {
  c = setDeckCount(c, 4).campaign;
  c = startTurn(c).campaign;
  c = endTurn(c, "pass").campaign;
  const r = startNextRound(c);
  if (r.error) throw new Error(r.error);
  return r.campaign;
}

describe("discovery sequencing", () => {
  it("has no discovery in round 1 and starts at #11 in round 2", () => {
    let c = fresh();
    expect(discoveryPending(c)).toBe(false);
    c = nextRound(c);
    expect(discoveryPending(c)).toBe(true);
    expect(upcoming(c)).toEqual([11, 12]);
  });

  it("discovers 2 cards and logs stubs without names", () => {
    const r = confirmDiscovery(nextRound(fresh()), false);
    expect(r.campaign.nextSerial).toBe(13);
    expect(r.campaign.cards.map((k) => [k.serial, k.name, k.status])).toEqual([
      [11, "", "kingdom"],
      [12, "", "kingdom"],
    ]);
    expect(r.campaign.rounds.at(-1)).toMatchObject({ discovered: [11, 12], discovery: "done" });
    expect(confirmDiscovery(r.campaign, false).error).toBeTruthy();
  });

  it("a parchment card is the only card discovered, and is destroyed", () => {
    const c = confirmDiscovery(nextRound(fresh()), true).campaign;
    expect(c.nextSerial).toBe(12);
    expect(c.cards).toHaveLength(1);
    expect(c.cards[0]).toMatchObject({ serial: 11, type: "parchment", status: "destroyed" });
    expect(upcoming(nextRound(c))).toEqual([12, 13]);
  });

  it("skips cards already discovered by effects, and returns undiscovered ones", () => {
    let c = discoverByEffect(nextRound(fresh()), 12).campaign;
    expect(upcoming(c)).toEqual([11, 13]);
    const id = c.cards.find((k) => k.serial === 12)!.id;
    c = updateCard(c, id, { status: "undiscovered" }).campaign;
    expect(upcoming(c)).toEqual([11, 12]);
  });

  it("the counter is editable", () => {
    const c = setNextSerial(nextRound(fresh()), 20).campaign;
    expect(upcoming(c)).toEqual([20, 21]);
    expect(setNextSerial(c, -1).error).toBeTruthy();
  });

  it("can skip or reopen a round's discovery", () => {
    const c = skipDiscovery(nextRound(fresh())).campaign;
    expect(discoveryPending(c)).toBe(false);
    expect(discoveryPending(reopenDiscovery(c).campaign)).toBe(true);
  });

  it("tracks the reset window until #23 is discovered", () => {
    let c = setNextSerial(nextRound(fresh()), 22).campaign;
    expect(resetWindowOpen(c)).toBe(true);
    c = confirmDiscovery(c, false).campaign;
    expect(resetWindowOpen(c)).toBe(false);
    expect(everDiscovered(c).has(23)).toBe(true);
  });

  it("counts down to #70 and never offers cards past it", () => {
    let c = nextRound(fresh());
    expect(cardsUntilFinal(c)).toBe(60);
    c = setNextSerial(c, 70).campaign;
    expect(upcoming(c)).toEqual([70]);
    expect(cardsUntilFinal(c)).toBe(1);
  });

  it("discovering #70 makes this the final round, then the game ends", () => {
    let c = setNextSerial(nextRound(fresh()), 69).campaign;
    const r = confirmDiscovery(c, false);
    expect(r.notices.join(" ")).toMatch(/FINAL ROUND/);
    c = r.campaign;
    expect(c.finalRound).toBe(2);
    expect(isFinalRound(c)).toBe(true);
    expect(cardsUntilFinal(c)).toBe(0);
    c = setDeckCount(c, 2).campaign;
    c = endTurn(startTurn(c).campaign, "time").campaign;
    expect(c.round.over).toBe(true);
    expect(startNextRound(c).error).toBeTruthy();
    c = finishGame(c).campaign;
    expect(c.gameOver).toBe(true);
    expect(startTurn(c).error).toBeTruthy();
  });

  it("a card effect can discover #70 too", () => {
    const c = discoverByEffect(nextRound(fresh()), 70).campaign;
    expect(c.finalRound).toBe(2);
  });
});
