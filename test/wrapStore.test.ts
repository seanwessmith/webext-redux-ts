import { spyOn, test, expect, mock, beforeEach, describe } from "bun:test";
import { configureStore } from "@reduxjs/toolkit";
import { createWrapStore } from "../src";
import shallowDiff from "../src/strategies/shallowDiff/diff";
import { DISPATCH_TYPE, STATE_TYPE, PATCH_STATE_TYPE } from "../src/constants";

describe("wrapStore", () => {
  const channelName = "test";

  beforeEach(() => {
    (global as any).self = {};
    const tabs = [1];

    // Mock chrome.runtime API
    self.chrome = {
      runtime: {
        onMessage: {
          addListener: () => {},
        },
        onConnectExternal: {
          addListener: () => {},
        },
        sendMessage: () => {},
      } as any,
      tabs: {
        query: (tabObject, cb) => {
          cb(tabs);
        },
        sendMessage: (data, message, cb) => {
          setTimeout(() => cb?.(), 0); // timeout is needed for Bun:test to work
        },
      } as any,
    } as any;
  });

  function setupListeners() {
    const tabs = [1];
    const listeners = {
      onMessage: [] as any[],
      onConnectExternal: [] as any[],
    };

    self.chrome = {
      runtime: {
        onMessage: {
          addListener: (fn: any) => listeners.onMessage.push(fn),
        },
        onConnectExternal: {
          addListener: (fn: any) => listeners.onConnectExternal.push(fn),
        },
        sendMessage: (data, message, cb) => {
          setTimeout(() => cb?.(), 0); // timeout is needed for Bun:test to work
        },
      } as any,
      tabs: {
        query: (tabObject, cb) => {
          cb(tabs);
        },
        sendMessage: (data, message, cb) => {
          cb = (message) => {
            return message;
          };
        },
      } as any,
    } as any;

    return listeners;
  }

  describe("on receiving messages", () => {
    let listeners, storeCreator, payload, message, sender, callback;

    beforeEach(() => {
      listeners = setupListeners();
      storeCreator = () =>
        configureStore({
          reducer: (state = {}, action) => state,
          middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
        });

      payload = {
        a: "a",
      };
      message = {
        type: DISPATCH_TYPE,
        channelName,
        payload,
      };
      sender = {};
      callback = () => {}; // noop.
    });

    test("should dispatch actions received on onMessage to store", async () => {
      const wrapStore = createWrapStore();

      wrapStore(storeCreator, { channelName });
      listeners.onMessage.forEach((l) => l(message, sender, callback));

      await Promise.resolve();

      // We can't directly check store.dispatch calls anymore, so we need to check state changes
      const store = storeCreator();
      expect(store.getState()).toEqual(expect.objectContaining(payload));
    });

    test("should not dispatch actions received on onMessage for other ports", () => {
      const wrapStore = createWrapStore();

      wrapStore(storeCreator, { channelName });
      message.channelName = channelName + "2";
      listeners.onMessage.forEach((l) => l(message, sender, callback));

      const store = storeCreator();
      expect(store.dispatch.mock.calls.length).toBe(0);
    });

    test("should deserialize incoming messages correctly", async () => {
      const deserializer = mock((data) => JSON.parse(data));
      const wrapStore = createWrapStore();

      wrapStore(storeCreator, { channelName, deserializer });
      message.payload = JSON.stringify(payload);
      listeners.onMessage.forEach((l) => l(message, sender, callback));

      await Promise.resolve();

      const store = storeCreator();
      expect(deserializer.mock.calls.length).toBe(1);
      expect(store.dispatch.mock.calls[0][0]).toEqual(
        Object.assign({}, payload, {
          _sender: sender,
        })
      );
    });

    test("should not deserialize incoming messages for other ports", () => {
      const deserializer = mock((data) => JSON.parse(data));
      const wrapStore = createWrapStore();

      wrapStore(storeCreator, { channelName, deserializer });
      message.channelName = channelName + "2";
      message.payload = JSON.stringify(payload);
      listeners.onMessage.forEach((l) => l(message, sender, callback));

      expect(deserializer.mock.calls.length).toBe(0);
    });
  });

  test("should serialize initial state and subsequent patches correctly", () => {
    const spy = spyOn(self.chrome.tabs, "sendMessage");

    const firstState = { a: 1, b: 2 };
    const secondState = { a: 1, b: 3, c: 5 };

    let currentState = firstState;
    const storeCreator = () =>
      configureStore({
        reducer: (state = currentState, action) => {
          if (action.type === "UPDATE_STATE") {
            return action.payload;
          }
          return state;
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
      });

    const serializer = (payload) => JSON.stringify(payload);
    const wrapStore = createWrapStore();

    wrapStore(storeCreator, { channelName, serializer });

    const store = storeCreator();
    store.dispatch({ type: "UPDATE_STATE", payload: secondState });
    currentState = secondState;

    const expectedSetupMessage = [
      {
        type: STATE_TYPE,
        channelName,
        payload: serializer(firstState),
      },
    ];
    const expectedPatchMessage = [
      {
        type: PATCH_STATE_TYPE,
        channelName,
        payload: serializer(shallowDiff(firstState, secondState)),
      },
    ];

    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[0][1]).toEqual(expectedSetupMessage);
    expect(spy.mock.calls[1][1]).toEqual(expectedPatchMessage);
  });

  test("should use the provided diff strategy", () => {
    const spy = spyOn(self.chrome.tabs, "sendMessage");

    const firstState = { a: 1, b: 2 };
    const secondState = { a: 1, b: 3, c: 5 };

    let currentState = firstState;
    const storeCreator = () =>
      configureStore({
        reducer: (state = currentState, action) => {
          if (action.type === "UPDATE_STATE") {
            return action.payload;
          }
          return state;
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
      });

    // Create a fake diff strategy
    const diffStrategy = (oldObj: any, newObj: any) => [
      {
        type: "FAKE_DIFF",
        oldObj,
        newObj,
      },
    ];
    const wrapStore = createWrapStore();

    wrapStore(storeCreator, { channelName, diffStrategy });

    const store = storeCreator();
    store.dispatch({ type: "UPDATE_STATE", payload: secondState });
    currentState = secondState;

    const expectedPatchMessage = [
      {
        type: PATCH_STATE_TYPE,
        channelName,
        payload: diffStrategy(firstState, secondState),
      },
    ];

    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[1][1]).toEqual(expectedPatchMessage);
  });

  describe("when validating options", () => {
    const storeCreator = () =>
      configureStore({
        reducer: (state = {}, action) => state,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
      });

    test("should use defaults if no options present", () => {
      expect(() => {
        const wrapStore = createWrapStore();
        wrapStore(storeCreator);
      }).not.toThrow();
    });

    test("should throw an error if serializer is not a function", () => {
      expect(() => {
        const wrapStore = createWrapStore();
        wrapStore(storeCreator, { channelName, serializer: "abc" as any });
      }).toThrow();
    });

    test("should throw an error if deserializer is not a function", () => {
      expect(() => {
        const wrapStore = createWrapStore();
        wrapStore(storeCreator, { channelName, deserializer: "abc" as any });
      }).toThrow();
    });

    test("should throw an error if diffStrategy is not a function", () => {
      expect(() => {
        const wrapStore = createWrapStore();
        wrapStore(storeCreator, { channelName, diffStrategy: "abc" as any });
      }).toThrow();
    });
  });

  test("should send a safety message to all tabs once initialized", () => {
    const tabs = [123, 456, 789, 1011, 1213];
    const tabResponders: any[] = [];
    const storeCreator = () =>
      configureStore({
        reducer: (state = {}, action) => state,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
      });

    self.chrome = {
      runtime: {
        onMessage: {
          addListener: () => {},
        },
        onConnectExternal: {
          addListener: () => {},
        },
        sendMessage: () => {},
      } as any,
      tabs: {
        query: (tabObject, cb) => {
          cb(tabs);
        },
        sendMessage: (tabId: any) => {
          tabResponders.push(tabId);
        },
      } as any,
    } as any;
    const wrapStore = createWrapStore();

    wrapStore(storeCreator, { channelName });

    expect(tabResponders.length).toBe(5);
  });
});
