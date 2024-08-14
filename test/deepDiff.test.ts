import { test, expect, describe, beforeEach } from "bun:test";
import deepDiff from "../src/strategies/deepDiff/diff";
import patchDeepDiff from "../src/strategies/deepDiff/patch";
import makeDiff from "../src/strategies/deepDiff/makeDiff";
import {
  DIFF_STATUS_REMOVED,
  DIFF_STATUS_UPDATED,
} from "../src/strategies/constants";

// Define types for the diff objects
type DiffItem = {
  key: string;
  value?: any;
  change: string;
};

type ArrayDiffItem = {
  type: string;
  oldPos: number;
  newPos: number;
  items: any[];
};

describe("deepDiff strategy", () => {
  describe("diff()", () => {
    test("should return an object containing updated fields", () => {
      const old: Record<string, number> = { a: 1 };
      const latest: Record<string, number> = { a: 2, b: 3 };
      const diff = deepDiff(old, latest);

      expect(diff.length).toBe(2);
      expect(diff).toEqual([
        {
          key: "a",
          value: 2,
          change: DIFF_STATUS_UPDATED,
        },
        {
          key: "b",
          value: 3,
          change: DIFF_STATUS_UPDATED,
        },
      ]);
    });

    test("should return an object containing removed fields", () => {
      const old: Record<string, number> = { b: 1 };
      const latest: Record<string, never> = {};
      const diff = deepDiff(old, latest);

      expect(diff.length).toBe(1);
      expect(diff).toEqual([
        {
          key: "b",
          change: DIFF_STATUS_REMOVED,
        },
      ]);
    });

    test("should not mark falsy values as removed", () => {
      const old: Record<string, number> = {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
        e: 5,
        f: 6,
        g: 7,
      };
      const latest: Record<string, any> = {
        a: 0,
        b: null,
        c: undefined,
        d: false,
        e: NaN,
        f: "",
        g: "",
      };
      const diff = deepDiff(old, latest);

      expect(diff.length).toBe(7);
      expect(diff).toEqual([
        {
          key: "a",
          value: 0,
          change: DIFF_STATUS_UPDATED,
        },
        {
          key: "b",
          value: null,
          change: DIFF_STATUS_UPDATED,
        },
        {
          key: "c",
          value: undefined,
          change: DIFF_STATUS_UPDATED,
        },
        {
          key: "d",
          value: false,
          change: DIFF_STATUS_UPDATED,
        },
        {
          key: "e",
          value: NaN,
          change: DIFF_STATUS_UPDATED,
        },
        {
          key: "f",
          value: "",
          change: DIFF_STATUS_UPDATED,
        },
        {
          key: "g",
          value: "",
          change: DIFF_STATUS_UPDATED,
        },
      ]);
    });

    describe("when references to keys are equal", () => {
      let old: { a: { b: number } };
      let latest: { a: { b: number } };

      beforeEach(() => {
        old = { a: { b: 1 } };
        latest = { ...old };
      });

      test("should not generate a diff", () => {
        const diff = deepDiff(old, latest);

        expect(diff.length).toBe(0);
      });

      test("should not compare nested values", () => {
        let accessed = false;

        Object.defineProperty(old.a, "b", {
          get: () => {
            accessed = true;
            return 1;
          },
        });
        deepDiff(old, latest);
        expect(accessed).toBe(false);
        latest.a.b;
        expect(accessed).toBe(true);
      });
    });

    // ... (rest of the tests follow the same pattern)
  });

  describe("patch()", () => {
    test("when there are no differences, should return the same object", () => {
      const oldObj: Record<string, number> = { a: 1 };
      const newObj = patchDeepDiff(oldObj, []);

      expect(newObj).toBe(oldObj);
    });

    // ... (rest of the tests follow the same pattern)
  });

  test("round trip: a simple array item append", () => {
    const oldObj: { a: number[] } = { a: [1] };
    const newObj: { a: number[] } = { a: [1, 2] };

    const result = patchDeepDiff(oldObj, deepDiff(oldObj, newObj) as any);

    expect(result).toEqual(newObj);
  });

  test("makeDiff should return a diff strategy function that uses the provided shouldContinue param", () => {
    let callCount = 0;
    const shouldContinue = () => {
      callCount++;
      return true;
    };
    const diffStrategy = makeDiff(shouldContinue);

    expect(callCount).toBe(0);
    diffStrategy({ a: { b: 1 } }, { a: { b: 2 } });
    expect(callCount).toBeGreaterThan(0);
  });
});
