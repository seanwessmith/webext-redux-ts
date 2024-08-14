import {
  spyOn,
  test,
  expect,
  mock,
  beforeEach,
  describe,
} from "bun:test";
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
    let listeners, store, payload, message, sender, callback;

    beforeEach(() => {
      listeners = setupListeners();
      store = {
        dispatch: mock(() => {}),
        subscribe: () => {
          return () => ({});
        },
        getState: () => ({}),
      };

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

      wrapStore(store, { channelName });
      listeners.onMessage.forEach((l) => l(message, sender, callback));

      await Promise.resolve();

      expect(store.dispatch.mock.calls.length).toBe(1);
      expect(store.dispatch.mock.calls[0][0]).toEqual(
        Object.assign({}, payload, {
          _sender: sender,
        })
      );
    });

    test("should not dispatch actions received on onMessage for other ports", () => {
      const wrapStore = createWrapStore();

      wrapStore(store, { channelName });
      message.channelName = channelName + "2";
      listeners.onMessage.forEach((l) => l(message, sender, callback));

      expect(store.dispatch.mock.calls.length).toBe(0);
    });

    test("should deserialize incoming messages correctly", async () => {
      const deserializer = mock((data) => JSON.parse(data));
      const wrapStore = createWrapStore();

      wrapStore(store, { channelName, deserializer });
      message.payload = JSON.stringify(payload);
      listeners.onMessage.forEach((l) => l(message, sender, callback));

      await Promise.resolve();

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

      wrapStore(store, { channelName, deserializer });
      message.channelName = channelName + "2";
      message.payload = JSON.stringify(payload);
      listeners.onMessage.forEach((l) => l(message, sender, callback));

      expect(deserializer.mock.calls.length).toBe(0);
    });
  });

  test("should serialize initial state and subsequent patches correctly", () => {
    // const sendMessage = (self.chrome.tabs.sendMessage = mock(() => {}));
    const spy = spyOn(self.chrome.tabs, "sendMessage");

    // Mock store subscription
    const subscribers: any[] = [];
    const store = {
      subscribe: (subscriber: any) => {
        subscribers.push(subscriber);
        return () => ({});
      },
      getState: mock(() => ({})),
    };

    // Stub state access
    const firstState = { a: 1, b: 2 };
    const secondState = { a: 1, b: 3, c: 5 };

    store.getState
      .mockImplementationOnce(() => firstState)
      .mockImplementationOnce(() => secondState)
      .mockImplementationOnce(() => secondState);

    const serializer = (payload) => JSON.stringify(payload);
    const wrapStore = createWrapStore();

    wrapStore(store, { channelName, serializer });

    // Simulate a state update by calling subscribers
    subscribers.forEach((subscriber) => subscriber());

    const expectedSetupMessage = [{
      type: STATE_TYPE,
      channelName,
      payload: serializer(firstState),
    }];
    const expectedPatchMessage = [{
      type: PATCH_STATE_TYPE,
      channelName,
      payload: serializer(shallowDiff(firstState, secondState)),
    }];

    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[0][1]).toEqual(expectedSetupMessage);
    expect(spy.mock.calls[1][1]).toEqual(expectedPatchMessage);
  });

  test("should use the provided diff strategy", () => {
    // const sendMessage = (self.chrome.tabs.sendMessage = mock(() => {}));
    const spy = spyOn(self.chrome.tabs, "sendMessage");

    // Mock store subscription
    const subscribers: any[] = [];
    const store = {
      subscribe: (subscriber: any) => {
        subscribers.push(subscriber);
        return () => ({});
      },
      getState: mock(() => ({})),
    };

    // Stub state access
    const firstState = { a: 1, b: 2 };
    const secondState = { a: 1, b: 3, c: 5 };

    store.getState
      .mockImplementationOnce(() => firstState)
      .mockImplementationOnce(() => secondState)
      .mockImplementationOnce(() => secondState);

    // Create a fake diff strategy
    const diffStrategy = (oldObj, newObj) => [
      {
        type: "FAKE_DIFF",
        oldObj,
        newObj,
      },
    ];
    const wrapStore = createWrapStore();

    wrapStore(store, { channelName, diffStrategy });

    // Simulate a state update by calling subscribers
    subscribers.forEach((subscriber) => subscriber());

    const expectedPatchMessage = [{
      type: PATCH_STATE_TYPE,
      channelName,
      payload: diffStrategy(firstState, secondState),
    }];

    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[1][1]).toEqual(expectedPatchMessage);
  });

  describe("when validating options", () => {
    const store = {
      dispatch: mock(() => {}),
      subscribe: () => {
        return () => ({});
      },
      getState: () => ({}),
    };

    test("should use defaults if no options present", () => {
      expect(() => {
        const wrapStore = createWrapStore();
        wrapStore(store);
      }).not.toThrow();
    });

    test("should throw an error if serializer is not a function", () => {
      expect(() => {
        const wrapStore = createWrapStore();
        wrapStore(store, { channelName, serializer: "abc" });
      }).toThrow();
    });

    test("should throw an error if deserializer is not a function", () => {
      expect(() => {
        const wrapStore = createWrapStore();
        wrapStore(store, { channelName, deserializer: "abc" });
      }).toThrow();
    });

    test("should throw an error if diffStrategy is not a function", () => {
      expect(() => {
        const wrapStore = createWrapStore();
        wrapStore(store, { channelName, diffStrategy: "abc" });
      }).toThrow();
    });
  });

  test("should send a safety message to all tabs once initialized", () => {
    const tabs = [123, 456, 789, 1011, 1213];
    const tabResponders: any[] = [];
    const store = {
      dispatch: mock(() => {}),
      subscribe: () => {
        return () => ({});
      },
      getState: () => ({}),
    };

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

    wrapStore(store, { channelName });

    expect(tabResponders.length).toBe(5);
  });
});
