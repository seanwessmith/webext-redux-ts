import {
  DIFF_STATUS_ARRAY_UPDATED,
  DIFF_STATUS_KEYS_UPDATED,
  DIFF_STATUS_REMOVED,
  DIFF_STATUS_UPDATED,
} from "../constants";
import { getPatch as getArrayPatch } from "./arrayDiff";

interface DiffResult {
  change: string;
  value?: any;
}

interface KeyDiff extends DiffResult {
  key: string;
}

export type ShouldContinueFunction = (
  oldObj: any,
  newObj: any,
  context: string[]
) => boolean;

const objectConstructor = {}.constructor;

function isObject(o: any): boolean {
  return (
    typeof o === "object" && o !== null && o.constructor === objectConstructor
  );
}

function shouldTreatAsValue(oldObj: any, newObj: any): boolean {
  const bothAreArrays = Array.isArray(oldObj) && Array.isArray(newObj);

  return (
    (!isObject(newObj) && !bothAreArrays) || typeof newObj !== typeof oldObj
  );
}

function diffValues(
  oldObj: any,
  newObj: any,
  shouldContinue: ShouldContinueFunction,
  context: string[]
): DiffResult {
  if (oldObj === null) {
    return { change: DIFF_STATUS_UPDATED, value: newObj };
  }

  if (
    shouldTreatAsValue(oldObj, newObj) ||
    !shouldContinue(oldObj, newObj, context)
  ) {
    return { change: DIFF_STATUS_UPDATED, value: newObj };
  }

  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    return {
      change: DIFF_STATUS_ARRAY_UPDATED,
      value: getArrayPatch(oldObj, newObj),
    };
  }

  return {
    change: DIFF_STATUS_KEYS_UPDATED,
    value: diffObjects(oldObj, newObj, shouldContinue, context),
  };
}

export default function diffObjects(
  oldObj: Record<string, any>,
  newObj: Record<string, any>,
  shouldContinue: ShouldContinueFunction = () => true,
  context: string[] = []
): KeyDiff[] {
  const difference: KeyDiff[] = [];

  Object.keys(newObj).forEach((key) => {
    if (oldObj[key] !== newObj[key]) {
      difference.push({
        key,
        ...diffValues(
          oldObj[key],
          newObj[key],
          shouldContinue,
          context.concat(key)
        ),
      });
    }
  });

  Object.keys(oldObj).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(newObj, key)) {
      difference.push({
        key,
        change: DIFF_STATUS_REMOVED,
      });
    }
  });

  return difference;
}
