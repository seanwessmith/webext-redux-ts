import { DIFF_STATUS_UPDATED, DIFF_STATUS_REMOVED } from "../constants";

// Define types for the difference items
type DiffStatus = typeof DIFF_STATUS_UPDATED | typeof DIFF_STATUS_REMOVED;

type DiffItem<T> = {
  key: keyof T;
  value?: T[keyof T];
  change: DiffStatus;
}

/**
 * Returns an array of changes representing the shallow difference between two objects
 *
 * @param oldObj - The original object
 * @param newObj - The new object to compare against the original
 * @returns An array of changes. Each change has a `key`, optional `value`, and `change` status.
 *   The change is either `updated`, which is if the value has changed or been added,
 *   or `removed`.
 */
export default function shallowDiff(
  oldObj: any,
  newObj: any
): DiffItem<any>[] {
  const difference: DiffItem<any>[] = [];

  (Object.keys(newObj) as Array<keyof any>).forEach((key) => {
    if (oldObj[key] !== newObj[key]) {
      difference.push({
        key,
        value: newObj[key],
        change: DIFF_STATUS_UPDATED,
      });
    }
  });

  (Object.keys(oldObj) as Array<keyof any>).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(newObj, key)) {
      difference.push({
        key,
        change: DIFF_STATUS_REMOVED,
      });
    }
  });

  return difference;
}
