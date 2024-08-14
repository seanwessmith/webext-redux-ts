import {
  DIFF_STATUS_ARRAY_UPDATED,
  DIFF_STATUS_KEYS_UPDATED,
  DIFF_STATUS_REMOVED,
  DIFF_STATUS_UPDATED,
} from "../constants";
import { applyPatch as applyArrayPatch } from "./arrayDiff";

// Define types for the difference items
type DiffStatus =
  | typeof DIFF_STATUS_ARRAY_UPDATED
  | typeof DIFF_STATUS_KEYS_UPDATED
  | typeof DIFF_STATUS_REMOVED
  | typeof DIFF_STATUS_UPDATED;

interface DiffItem<T> {
  key: keyof T;
  value?: any;
  change: DiffStatus;
}

/**
 * Patches the given object according to the specified list of patches.
 * @param obj The object to patch
 * @param difference The array of differences generated from diffing
 * @returns The patched object
 */
export default function patchObject<T extends object>(
  obj: T,
  difference: DiffItem<T>[]
): T {
  if (!difference.length) {
    return obj;
  }

  // Start with a shallow copy of the object.
  const newObject: any = { ...obj };

  // Iterate through the patches.
  difference.forEach((patch) => {
    // If the value is an object whose keys are being updated,
    // then recursively patch the object.
    if (patch.change === DIFF_STATUS_KEYS_UPDATED) {
      newObject[patch.key] = patchObject(
        newObject[patch.key] as any,
        patch.value
      );
    }
    // If the key has been deleted, delete it.
    else if (patch.change === DIFF_STATUS_REMOVED) {
      delete newObject[patch.key];
    }
    // If the key has been updated to a new value, update it.
    else if (patch.change === DIFF_STATUS_UPDATED) {
      newObject[patch.key] = patch.value;
    }
    // If the value is an array, update it
    else if (patch.change === DIFF_STATUS_ARRAY_UPDATED) {
      newObject[patch.key] = applyArrayPatch(
        newObject[patch.key] as any[],
        patch.value
      );
    }
  });
  return newObject;
}
