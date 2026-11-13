import { describe, expect, it } from "vitest";
import { newCampaign } from "./defaults";
import {
  addCard,
  addStartingKingdom,
  adjustBoost,
  deleteCard,
  filterCards,
  kingdomFame,
  scorePreview,
  shuffledCardCount,
  updateCard,
} from "./kingdom";
import { applyPurge, purgePicks, setPurgedFameAdjust } from "./purge";
import type { Campaign } from "./types";

const fresh = () => newCampaign("T", "c1", new Date("2026-01-01"));
const idOf = (c: Campaign, serial: number) => c.cards.find((k) => k.serial === serial)!.id;

function sample() {
  let c = addStartingKingdom(fresh()).campaign;
  c = updateCard(c, idOf(c, 1), { name: "Alpha", fame: 3 }).campaign;
  c = updateCard(c, idOf(c, 2), { name: "Beta", fame: 2, status: "permanent" }).campaign;
  c = updateCard(c, idOf(c, 3), { name: "Gamma", fame: -1, type: "enemy" }).campaign;
  c = updateCard(c, idOf(c, 4), { fame: 5, status: "destroyed" }).campaign;
  return c;
}

describe("kingdom log", () => {
  it("adds the starting kingdom as blank stubs, once", () => {
    const c = addStartingKingdom(fresh()).campaign;
    expect(c.cards.map((k) => k.serial)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(c.cards.every((k) => k.name === "")).toBe(true);
    expect(addStartingKingdom(c).error).toBeTruthy();
  });

  it("rejects duplicate serials but brings back undiscovered cards", () => {
    let c = addCard(fresh(), { serial: 30, name: "X" }).campaign;
    expect(addCard(c, { serial: 30 }).error).toBeTruthy();
    c = updateCard(c, idOf(c, 30), { status: "undiscovered" }).campaign;
    c = addCard(c, { serial: 30 }).campaign;
    expect(c.cards).toHaveLength(1);
    expect(c.cards[0].status).toBe("kingdom");
    expect(addCard(c, { serial: -2 }).error).toBeTruthy();
  });

  it("sums fame of kingdom and permanent cards only", () => {
    expect(kingdomFame(sample())).toBe(3 + 2 - 1);
  });

  it("filters by status, type, name and number", () => {
    const c = sample();
    const all = { status: "all", type: "all", query: "" } as const;
    expect(filterCards(c.cards, { ...all, status: "permanent" }).map((k) => k.serial)).toEqual([2]);
    expect(filterCards(c.cards, { ...all, type: "enemy" }).map((k) => k.serial)).toEqual([3]);
    expect(filterCards(c.cards, { ...all, query: "gam" }).map((k) => k.serial)).toEqual([3]);
    expect(filterCards(c.cards, { ...all, query: "#4" }).map((k) => k.serial)).toEqual([4]);
  });

  it("equipment is destroyed with its holder, and can't loop", () => {
    let c = sample();
    c = updateCard(c, idOf(c, 5), { equippedTo: idOf(c, 1) }).campaign;
    expect(updateCard(c, idOf(c, 1), { equippedTo: idOf(c, 5) }).error).toBeTruthy();
    expect(updateCard(c, idOf(c, 5), { equippedTo: idOf(c, 5) }).error).toBeTruthy();
    const r = updateCard(c, idOf(c, 1), { status: "destroyed" });
    expect(r.campaign.cards.find((k) => k.serial === 5)!.status).toBe("destroyed");
    expect(r.notices[0]).toMatch(/equipment/);
  });

  it("equipped cards are not counted as separate cards in the deck", () => {
    let c = sample();
    const before = shuffledCardCount(c);
    c = updateCard(c, idOf(c, 5), { equippedTo: idOf(c, 1) }).campaign;
    expect(shuffledCardCount(c)).toBe(before - 1);
  });

  it("tracks resource stickers per resource", () => {
    let c = sample();
    c = adjustBoost(c, idOf(c, 1), "wood", 1).campaign;
    c = adjustBoost(c, idOf(c, 1), "wood", 1).campaign;
    c = adjustBoost(c, idOf(c, 1), "coin", -1).campaign;
    expect(c.cards[0].boosts).toEqual({ wood: 2 });
  });

  it("deleting a holder un-equips its equipment", () => {
    let c = sample();
    c = updateCard(c, idOf(c, 5), { equippedTo: idOf(c, 1) }).campaign;
    c = deleteCard(c, idOf(c, 1)).campaign;
    expect(c.cards.find((k) => k.serial === 5)!.equippedTo).toBeNull();
  });
});

describe("purge and score", () => {
  it("picks 1 card per full group of 12", () => {
    expect(purgePicks(11)).toBe(0);
    expect(purgePicks(12)).toBe(1);
    expect(purgePicks(35)).toBe(2);
    expect(purgePicks(36)).toBe(3);
    expect(purgePicks(-1)).toBe(0);
  });

  it("purges friendly cards, moves their fame to purged fame, keeps the score", () => {
    const c = sample();
    const before = scorePreview(c);
    const r = applyPurge(c, { label: "Purge 12", cardIds: [idOf(c, 1)], extraFame: 1 });
    expect(r.error).toBeUndefined();
    const after = scorePreview(r.campaign);
    expect(after.purged).toBe(4);
    expect(after.kingdom).toBe(before.kingdom - 3);
    expect(r.campaign.cards[0].status).toBe("purged");
  });

  it("refuses enemies, gone cards and empty purges", () => {
    const c = sample();
    expect(applyPurge(c, { label: "", cardIds: [idOf(c, 3)], extraFame: 0 }).error).toMatch(/friendly/);
    expect(applyPurge(c, { label: "", cardIds: [idOf(c, 4)], extraFame: 0 }).error).toBeTruthy();
    expect(applyPurge(c, { label: "", cardIds: [], extraFame: 0 }).error).toBeTruthy();
  });

  it("score = kingdom fame + purged fame (with hand corrections)", () => {
    const c = setPurgedFameAdjust(sample(), 7).campaign;
    expect(scorePreview(c)).toEqual({ kingdom: 4, purged: 7, total: 11 });
    expect(setPurgedFameAdjust(c, 1.5).error).toBeTruthy();
  });
});
