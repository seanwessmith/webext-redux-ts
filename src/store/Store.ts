import {
  DISPATCH_TYPE,
  FETCH_STATE_TYPE,
  STATE_TYPE,
  PATCH_STATE_TYPE,
  DEFAULT_CHANNEL_NAME,
} from "../constants/index";
import { assignIn } from "lodash";
import { Transformer } from "../types";
import { withSerializer, withDeserializer, noop } from "../serialization";
import shallowDiff, { DiffItem } from "../strategies/shallowDiff/patch";
import { getBrowserAPI } from "../util";

const backgroundErrPrefix =
  "\nLooks like there is an error in the background page. " +
  "You might want to inspect your background page for more details.\n";

const defaultOpts = {
  channelName: DEFAULT_CHANNEL_NAME,
  state: {},
  serializer: noop,
  deserializer: noop,
  patchStrategy: shallowDiff,
};

interface Message {
  type: string;
  channelName: string;
  payload?: any;
}

export type StoreOptions = {
  channelName?: string;
  state?: {};
  serializer?: Transformer;
  deserializer?: Transformer;
  patchStrategy?: <T extends object>(obj: T, difference: DiffItem<T>[]) => T;
};

class Store {
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
  private channelName: string | undefined;
  private readyResolved: boolean;
  private readyPromise: Promise<unknown>;
  public readyResolve: (value?: unknown) => void = () => {};
  private browserAPI: any;
  // Remove the duplicate declaration of 'initializeStore'
  private serializedPortListener: (
    listener: any,
    shouldDeserialize: any
  ) => void;
  private serializedMessageSender: (
    message: any,
    options: any,
    responseCallback: any
  ) => void;
  private listeners: any[];
  private state: any;
  private patchStrategy: any;
  private deserializer: any;
  constructor(options?: StoreOptions) {
    const { channelName, state, serializer, deserializer, patchStrategy } = {
      ...defaultOpts,
      ...options,
    };
    if (!channelName) {
      throw new Error("channelName is required in options");
    }
    if (typeof serializer !== "function") {
      throw new Error("serializer must be a function");
    }
    if (typeof deserializer !== "function") {
      throw new Error("deserializer must be a function");
    }
    if (typeof patchStrategy !== "function") {
      throw new Error(
        "patchStrategy must be one of the included patching strategies or a custom patching function"
      );
    }

    this.channelName = channelName;
    this.readyResolved = false;
    this.readyPromise = new Promise((resolve) => (this.readyResolve = resolve));

    this.browserAPI = getBrowserAPI();
    this.initializeStore = this.initializeStore.bind(this);

    // We request the latest available state data to initialise our store
    this.browserAPI.runtime.sendMessage(
      { type: FETCH_STATE_TYPE, channelName },
      undefined,
      this.initializeStore
    );

    this.deserializer = deserializer;
    this.serializedPortListener = withDeserializer(deserializer)((...args) =>
      this.browserAPI.runtime.onMessage.addListener(...args)
    );
    this.serializedMessageSender = withSerializer(serializer)((...args) =>
      this.browserAPI.runtime.sendMessage(...args)
    );
    this.listeners = [];
    this.state = state;
    this.patchStrategy = patchStrategy;

    /**
     * Determine if the message should be run through the deserializer. We want
     * to skip processing messages that probably didn't come from this library.
     * Note that the listener below is still called for each message so it needs
     * its own guard, the shouldDeserialize predicate only skips _deserializing_
     * the message.
     */
    const shouldDeserialize = (message: Message) => {
      return (
        Boolean(message) &&
        typeof message.type === "string" &&
        message.channelName === this.channelName
      );
    };

    this.serializedPortListener((message: Message) => {
      if (!message || message.channelName !== this.channelName) {
        return;
      }

      switch (message.type) {
        case STATE_TYPE:
          this.replaceState(message.payload);

          if (!this.readyResolved) {
            this.readyResolved = true;
            this.readyResolve();
          }
          break;

        case PATCH_STATE_TYPE:
          this.patchState(message.payload);
          break;

        default:
        // do nothing
      }
    }, shouldDeserialize);

    this.dispatch = this.dispatch.bind(this); // add this context to dispatch
    this.getState = this.getState.bind(this); // add this context to getState
    this.subscribe = this.subscribe.bind(this); // add this context to subscribe
  }

  /**
   * Returns a promise that resolves when the store is ready. Optionally a callback may be passed in instead.
   * @param [function] callback An optional callback that may be passed in and will fire when the store is ready.
   * @return {object} promise A promise that resolves when the store has established a connection with the background page.
   */
  ready(cb = null) {
    if (cb !== null) {
      return this.readyPromise.then(cb);
    }

    return this.readyPromise;
  }

  /**
   * Subscribes a listener function for all state changes
   * @param  {function} listener A listener function to be called when store state changes
   * @return {function}          An unsubscribe function which can be called to remove the listener from state updates
   */
  subscribe(listener: any) {
    this.listeners.push(listener);

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Replaces the state for only the keys in the updated state. Notifies all listeners of state change.
   * @param {object} state the new (partial) redux state
   */
  patchState(difference: any) {
    this.state = this.patchStrategy(this.state, difference);
    this.listeners.forEach((l) => l());
  }

  /**
   * Replace the current state with a new state. Notifies all listeners of state change.
   * @param  {object} state The new state for the store
   */
  replaceState(state: any) {
    this.state = state;

    this.listeners.forEach((l) => l());
  }

  /**
   * Get the current state of the store
   * @return {object} the current store state
   */
  getState() {
    return this.state;
  }

  /**
   * Stub function to stay consistent with Redux Store API. No-op.
   */
  replaceReducer() {
    return;
  }

  /**
   * Dispatch an action to the background using messaging passing
   * @data The action data to dispatch
   * @return Promise that will resolve/reject based on the action response from the background
   */
  dispatch(data: any) {
    return new Promise((resolve, reject) => {
      this.serializedMessageSender(
        {
          type: DISPATCH_TYPE,
          channelName: this.channelName,
          payload: data,
        },
        null,
        (resp: any) => {
          if (!resp) {
            const error = this.browserAPI.runtime.lastError;
            const bgErr = new Error(`${backgroundErrPrefix}${error}`);

            reject(assignIn(bgErr, error));
            reject(Object.assign({}, bgErr, error));
            return;
          }

          const { error, value } = resp;

          if (error) {
            const bgErr = new Error(`${backgroundErrPrefix}${error}`);

            reject(assignIn(bgErr, error));
            // reject(Object.assign({}, bgErr, error));
          } else {
            resolve(value && value.payload);
          }
        }
      );
    });
  }

  initializeStore(message: any) {
    if (message && message.type === FETCH_STATE_TYPE) {
      this.replaceState(message.payload);

      // Resolve if readyPromise has not been resolved.
      if (!this.readyResolved) {
        this.readyResolved = true;
        this.readyResolve();
      }
    }
  }
}

export default Store;
