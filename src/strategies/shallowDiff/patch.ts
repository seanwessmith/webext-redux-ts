import { DIFF_STATUS_UPDATED, DIFF_STATUS_REMOVED } from "../constants";

// Define the types for the difference array
type DiffStatus = typeof DIFF_STATUS_UPDATED | typeof DIFF_STATUS_REMOVED;

export interface DiffItem<T> {
  change: DiffStatus;
  key: keyof T;
  value?: T[keyof T];
}

export default function applyDifference<T extends object>(
  obj: T,
  difference: DiffItem<T>[]
): T {
  const newObj = { ...obj };

  difference.forEach(({ change, key, value }) => {
    switch (change) {
      case DIFF_STATUS_UPDATED:
        if (value !== undefined) {
          newObj[key] = value;
        }
        break;

      case DIFF_STATUS_REMOVED:
        delete newObj[key];
        break;

      default:
      // do nothing
    }
  });

  return newObj;
}
