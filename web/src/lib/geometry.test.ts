import { describe, expect, it } from "vitest";
import { analyzeNet } from "./cubeNet";
import { floatingCells, frontView, sideView, topCounts, topView } from "./blocks";
import type { Cell, NetFace } from "../types";

const f = (id: string, col: number, row: number): NetFace => ({ id, col, row });

describe("cube net", () => {
  // 십자형:   A
  //         B C D E
  //           F
  const cross = [f("A", 1, 0), f("B", 0, 1), f("C", 1, 1), f("D", 2, 1), f("E", 3, 1), f("F", 1, 2)];

  it("folds a cross net into a cube with correct opposite faces", () => {
    const r = analyzeNet(cross, "C");
    expect(r.valid).toBe(true);
    const pairs = r.opposite.map((p) => [...p].sort().join(""));
    expect(pairs.sort()).toEqual(["AF", "BD", "CE"]);
  });

  it("gives the same result regardless of base face", () => {
    const r = analyzeNet(cross, "E");
    expect(r.opposite.map((p) => [...p].sort().join("")).sort()).toEqual(["AF", "BD", "CE"]);
  });

  it("rejects a 2x3 block (not a net)", () => {
    const bad = [f("A", 0, 0), f("B", 1, 0), f("C", 2, 0), f("D", 0, 1), f("E", 1, 1), f("F", 2, 1)];
    expect(analyzeNet(bad, "A").valid).toBe(false);
  });

  it("rejects a straight line of 6", () => {
    const line = Array.from({ length: 6 }, (_, i) => f(String(i), i, 0));
    expect(analyzeNet(line, "0").valid).toBe(false);
  });

  it("accepts the 3-3 staircase net", () => {
    const stair = [f("A", 0, 0), f("B", 1, 0), f("C", 2, 0), f("D", 2, 1), f("E", 3, 1), f("F", 4, 1)];
    expect(analyzeNet(stair, "B").valid).toBe(true);
  });

  it("rejects disconnected faces", () => {
    const gap = [f("A", 0, 0), f("B", 1, 0), f("C", 2, 0), f("D", 3, 0), f("E", 1, 1), f("F", 5, 5)];
    expect(analyzeNet(gap, "A").valid).toBe(false);
  });
});

describe("blocks", () => {
  // 1층 L자 3개 + 왼쪽 앞 2층 1개
  const cells: Cell[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];

  it("computes views", () => {
    expect(topView(cells)).toEqual([[true, false], [true, true]]);
    expect(topCounts(cells)).toEqual([[1, 0], [2, 1]]);
    expect(frontView(cells)).toEqual([[true, false], [true, true]]);
    expect(sideView(cells)).toEqual([[true, false], [true, true]]);
  });

  it("finds floating blocks", () => {
    expect(floatingCells([[0, 0, 0], [1, 0, 1]])).toEqual([[1, 0, 1]]);
    expect(floatingCells(cells)).toEqual([]);
  });
});
