import { describe, expect, it } from "vitest";
import { commit, createHistory, redo, undo } from "./history";

describe("undo history", () => {
  it("undoes and redoes with labels", () => {
    let h = createHistory(0);
    h = commit(h, 1, "one");
    h = commit(h, 2, "two");
    const u = undo(h);
    expect(u.history.present).toBe(1);
    expect(u.label).toBe("two");
    const r = redo(u.history);
    expect(r.history.present).toBe(2);
    expect(r.label).toBe("two");
  });

  it("keeps at least 20 steps", () => {
    let h = createHistory(0);
    for (let i = 1; i <= 25; i++) h = commit(h, i, `step ${i}`);
    for (let i = 0; i < 25; i++) h = undo(h).history;
    expect(h.present).toBe(0);
  });

  it("drops the oldest steps past the limit", () => {
    let h = createHistory(0);
    for (let i = 1; i <= 10; i++) h = commit(h, i, "x", 3);
    expect(h.past.map((e) => e.state)).toEqual([7, 8, 9]);
  });

  it("clears redo after a new change and ignores no-ops", () => {
    let h = commit(createHistory("a"), "b", "b");
    h = undo(h).history;
    h = commit(h, "c", "c");
    expect(h.future).toEqual([]);
    expect(commit(h, h.present, "same")).toBe(h);
    expect(undo(createHistory(1)).label).toBeNull();
  });
});
