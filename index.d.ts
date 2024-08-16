import redux from "redux";

export type DiffStrategy = (oldObj: any, newObj: any) => any;
export type PatchStrategy = (oldObj: any, patch: any) => any;

export class Store<S = any, A extends redux.Action = redux.Action> {
  /**
   * Creates a new Proxy store
   * @param  {object} options
   * @param {string} options.channelName The name of the channel for this store.
   * @param {object} options.state The initial state of the store (default
   * `{}`).
   * @param {function} options.serializer A function to serialize outgoing
   * messages (default is passthrough).
   * @param {function} options.deserializer A function to deserialize incoming
   * messages (default is passthrough).
   * @param {function} options.patchStrategy A function to patch the state with
   * incoming messages. Use one of the included patching strategies or a custom
   * patching function. (default is shallow diff).
   */
  constructor(options?: {
    channelName?: string;
    state?: any;
    serializer?: Function;
    deserializer?: Function;
    patchStrategy?: PatchStrategy;
  });

  /**
   * Returns a promise that resolves when the store is ready.
   * @return promise A promise that resolves when the store has established a connection with the background page.
   */
  ready(): Promise<void>;

  /**
   * Returns a promise that resolves when the store is ready.
   * @param callback An callback that will fire when the store is ready.
   * @return promise A promise that resolves when the store has established a connection with the background page.
   */
  ready<S>(cb: () => S): Promise<S>;

  /**
   * Subscribes a listener function for all state changes
   * @param listener A listener function to be called when store state changes
   * @return An unsubscribe function which can be called to remove the listener from state updates
   */
  subscribe(listener: () => void): () => void;

  /**
   * Replace the current state with a new state. Notifies all listeners of state change.
   * @param state The new state for the store
   */
  replaceState(state: S): void;

  /**
   * Replaces the state for only the keys in the updated state. Notifies all listeners of state change.
   * @param difference the new (partial) redux state
   */
  patchState(difference: Array<any>): void;

  /**
   * Stub function to stay consistent with Redux Store API. No-op.
   * @param nextReducer The reducer for the store to use instead.
   */
  replaceReducer(nextReducer: redux.Reducer<S>): void;

  /**
   * Get the current state of the store
   * @return the current store state
   */
  getState(): S;

  /**
   * Dispatch an action to the background using messaging passing
   * @param data The action data to dispatch
   *
   * Note: Although the return type is specified as the action, react-chrome-redux will
   * wrap the result in a responsePromise that will resolve/reject based on the
   * action response from the background page
   */
  dispatch<A>(data: A): A;

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  [Symbol.observable](): Observable<S>;
}

type WrapStore<S, A extends redux.Action = redux.Action> = (
  store: redux.Store<S, A>,
  configuration?: {
    channelName?: string;
    dispatchResponder?(
      dispatchResult: any,
      send: (response: any) => void
    ): void;
    serializer?: Function;
    deserializer?: Function;
    diffStrategy?: DiffStrategy;
  }
) => void;

export function createWrapStore<
  S,
  A extends redux.Action = redux.Action
>(): WrapStore<S, A>;

export function alias(aliases: {
  [key: string]: (action: any) => any;
}): redux.Middleware;

export function applyMiddleware(
  store: Store,
  ...middleware: redux.Middleware[]
): Store;

/**
 * Function to remove listener added by `Store.subscribe()`.
 */
export interface Unsubscribe {
  (): void;
}

/**
 * A minimal observable of state changes.
 * For more information, see the observable proposal:
 * https://github.com/tc39/proposal-observable
 */
export type Observable<T> = {
  /**
   * The minimal observable subscription method.
   * @param {Object} observer Any object that can be used as an observer.
   * The observer object should have a `next` method.
   * @returns {subscription} An object with an `unsubscribe` method that can
   * be used to unsubscribe the observable from the store, and prevent further
   * emission of values from the observable.
   */
  subscribe: (observer: Observer<T>) => { unsubscribe: Unsubscribe };
  [Symbol.observable](): Observable<T>;
};

/**
 * An Observer is used to receive data from an Observable, and is supplied as
 * an argument to subscribe.
 */
export type Observer<T> = {
  next?(value: T): void;
};
