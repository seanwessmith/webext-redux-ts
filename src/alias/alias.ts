/**
 * Represents an action object in Redux.
 */
interface Action {
  type: string;
  [key: string]: any;
}

/**
 * Represents a function that takes an action and returns a new action.
 */
type AliasFunction = (action: Action) => Action;

/**
 * Represents an object mapping action types to alias functions.
 */
interface AliasMap {
  [actionType: string]: AliasFunction;
}

/**
 * Represents the next middleware or reducer in the chain.
 */
type NextFunction = (action: Action) => any;

/**
 * Represents the dispatch function.
 */
type DispatchFunction = (action: Action) => any;

/**
 * Simple middleware intercepts actions and replaces with
 * another by calling an alias function with the original action
 * @param aliases an object that maps action types (keys) to alias functions (values)
 */
const aliasMiddleware = (aliases: AliasMap) => 
  () => 
  (next: NextFunction) => 
  (action: Action): any => {
    const alias = aliases[action.type];

    if (alias) {
      return next(alias(action));
    }

    return next(action);
  };

export default aliasMiddleware;