import { test, expect } from "bun:test";
import shallowDiff from "../src/strategies/shallowDiff/diff";
import patchShallowDiff from "../src/strategies/shallowDiff/patch";
import {
  DIFF_STATUS_UPDATED,
  DIFF_STATUS_REMOVED,
} from "../src/strategies/constants";

test("shallowDiff strategy", () => {
  test("#diff()", () => {
    test("should return an object containing updated fields", () => {
      const old = { a: 1 };
      const latest = { a: 2, b: 3 };
      const diff = shallowDiff(old, latest);

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
      const old = { b: 1 };
      const latest = {};
      const diff = shallowDiff(old, latest);

      expect(diff.length).toBe(1);
      expect(diff).toEqual([
        {
          key: "b",
          change: DIFF_STATUS_REMOVED,
        },
      ]);
    });

    test("should not mark falsy values as removed", () => {
      const old = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 };
      const latest = {
        a: 0,
        b: null,
        c: undefined,
        d: false,
        e: NaN,
        f: "",
        g: "",
      };
      const diff = shallowDiff(old, latest);

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
  });

  test("#patch()", () => {
    let oldObj, newObj;

    test("should update correctly", () => {
      oldObj = { b: 1, c: {} };
      newObj = patchShallowDiff(oldObj, [
        { key: "a", value: 123, change: DIFF_STATUS_UPDATED },
        { key: "b", change: DIFF_STATUS_REMOVED },
      ]);

      expect(newObj).not.toBe(oldObj);
      expect(newObj.c).toBe(oldObj.c);
      expect(newObj).toEqual({ a: 123, c: {} });
    });
  });
});
