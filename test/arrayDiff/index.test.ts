import { describe, test, expect } from "bun:test";
import * as diff from "../../src/strategies/deepDiff/arrayDiff/index";

/**
 * Test for index interface
 */
describe("Index", () => {
  test("same function in index", () => {
    expect(diff.same([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
  });

  test("diff data and function in index", () => {
    const result = {
      added: [1, 2],
      removed: [3, 4],
    };

    expect(diff.diff([3, 4, 5, 6], [1, 2, 5, 6])).toEqual(result);
  });

  test("getPatch function in index", () => {
    expect(diff.getPatch([1, 2, 3], [2, 3, 4])).toEqual([
      { type: "remove", oldPos: 0, newPos: 0, items: [1] },
      { type: "add", oldPos: 3, newPos: 2, items: [4] },
    ]);
  });

  test("applyPatch function in index", () => {
    expect(
      diff.applyPatch(
        [1, 2, 3],
        [
          { type: "remove", oldPos: 0, newPos: 0, items: [1] },
          { type: "add", oldPos: 3, newPos: 2, items: [4] },
        ]
      )
    ).toEqual([2, 3, 4]);
  });
});
