import { spyOn, expect, test, describe, beforeEach, mock } from "bun:test";
import { Store } from "../src";
import { DISPATCH_TYPE, FETCH_STATE_TYPE, STATE_TYPE } from "../src/constants";
import {
  DIFF_STATUS_UPDATED,
  DIFF_STATUS_REMOVED,
} from "../src/strategies/constants";

describe("Store", () => {
  const channelName = "test";

  beforeEach(() => {
    (global as any).self = {};

    // Mock chrome.runtime API
    self.chrome = {
      runtime: {
        connect() {
          return {
            onMessage: {
              addListener() {},
            },
          };
        },
        sendMessage(data: any, options: any, cb: (message: string) => void) {
          cb = (message) => {
            return message;
          };
        },
        onMessage: {
          addListener: () => {},
        },
      } as any,
    } as any;
  });

  describe("new Store()", () => {
    let listeners: Array<(message: any) => void>;

    beforeEach(() => {
      // mock connect.onMessage listeners array
      listeners = [];

      // override mock chrome API for this test
      (self as any).chrome.runtime = {
        sendMessage: (data, message, cb) => {
          setTimeout(() => cb(), 0); // timeout is needed for Bun:test to work
        },
        onMessage: {
          addListener: (listener: (message: any) => void) => {
            listeners.push(listener);
          },
        },
      };
    });

    test("should setup a listener on the channel defined by the channelName option", () => {
      // const spy = spyOn(self.chrome.runtime, "sendMessage");

      const spy = spyOn(self.chrome.runtime, "sendMessage");

      new Store({ channelName });

      expect(spy).toHaveBeenCalledTimes(1);

      // Check if the mock was called with the correct arguments
      expect(spy).toHaveBeenCalledWith(
        {
          type: FETCH_STATE_TYPE,
          channelName,
        },
        undefined,
        expect.any(Function)
      );
    });

    test("should call replaceState on new state messages", () => {
      const store = new Store({ channelName });

      // make replaceState() a spy function
      const spy = spyOn(store, "replaceState");

      const [l] = listeners;

      const payload = {
        a: 1,
      };

      // send one state type message
      l({
        type: STATE_TYPE,
        payload,
        channelName,
      });

      // send one non-state type message
      l({
        type: `NOT_${STATE_TYPE}`,
        payload: {
          a: 2,
        },
      });

      // make sure replace state was only called once
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(payload);
    });

    test("should deserialize incoming messages", () => {
      const deserializer = mock(JSON.parse);
      const store = new Store({ channelName, deserializer });

      // make replaceState() a spy function
      const spy = spyOn(store, "replaceState");

      const [l] = listeners;

      const payload = {
        a: 1,
      };

      // send one state type message
      l({
        type: STATE_TYPE,
        payload: JSON.stringify(payload),
        channelName,
      });

      // send one non-state type message
      l({
        type: `NOT_${STATE_TYPE}`,
        payload: JSON.stringify({
          a: 2,
        }),
      });

      // make sure replace state was called with the deserialized payload
      expect(spy).toHaveBeenCalledWith(payload);
    });

    test("should set the initial state to empty object by default", () => {
      const store = new Store({ channelName });

      expect(store.getState()).toEqual({});
    });

    test("should set the initial state to opts.state if available", () => {
      const store = new Store({ channelName, state: { a: "a" } });

      expect(store.getState()).toEqual({ a: "a" });
    });

    test("should setup a initializeStore listener", () => {
      // mock onMessage listeners array
      const initializeStoreListener: Array<(response: any) => void> = [];

      // override mock chrome API for this test
      (self as any).chrome.runtime.sendMessage = (
        message: any,
        options: any,
        listener: (response: any) => void
      ) => {
        initializeStoreListener.push(listener);
      };

      const store = new Store({ channelName });

      expect(initializeStoreListener.length).toBe(1);

      const [l] = initializeStoreListener;

      // make readyResolve() a spy function
      const spy = spyOn(store, "readyResolve");

      const payload = {
        a: 1,
      };

      // Receive message response
      l({ type: FETCH_STATE_TYPE, payload });

      expect((store as any).readyResolved).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    test("should listen only to channelName state changes", () => {
      // mock onMessage listeners array
      const stateChangesListener: Array<(message: any) => void> = [];

      // override mock chrome API for this test
      (self as any).chrome.runtime = {
        onMessage: {
          addListener: (listener: (message: any) => void) => {
            stateChangesListener.push(listener);
          },
        },
        sendMessage: () => {},
      };

      const store = new Store({ channelName });
      const channelName2 = "test2";
      const store2 = new Store({ channelName: channelName2 });

      expect(stateChangesListener.length).toBe(2);

      const [l1, l2] = stateChangesListener;

      // make readyResolve() a spy function
      const spy1 = spyOn(store, "readyResolve");
      const spy2 = spyOn(store2, "readyResolve");

      // send message for channel 1
      l1({
        type: STATE_TYPE,
        channelName,
        payload: [{ change: "updated", key: "a", value: "1" }],
      });
      l2({
        type: STATE_TYPE,
        channelName,
        payload: [{ change: "updated", key: "b", value: "2" }],
      });

      expect(stateChangesListener.length).toBe(2);

      expect((store as any).readyResolved).toBe(true);
      expect(spy1).toHaveBeenCalledTimes(1);
      expect((store2 as any).readyResolved).toBe(false);
      expect(spy2).not.toHaveBeenCalled();

      // send message for channel 2
      l1({
        type: STATE_TYPE,
        channelName: channelName2,
        payload: [{ change: "updated", key: "a", value: "1" }],
      });
      l2({
        type: STATE_TYPE,
        channelName: channelName2,
        payload: [{ change: "updated", key: "b", value: "2" }],
      });
      expect(stateChangesListener.length).toBe(2);
      expect((store as any).readyResolved).toBe(true);
      expect(spy1).toHaveBeenCalledTimes(1);
      expect((store2 as any).readyResolved).toBe(true);
      expect(spy2).toHaveBeenCalledTimes(1);
    });
  });

  describe("patchState()", () => {
    test("should patch the state of the store", () => {
      const store = new Store({ channelName, state: { b: 1 } });

      expect(store.getState()).toEqual({ b: 1 });

      store.patchState([
        { key: "a", value: 123, change: DIFF_STATUS_UPDATED },
        { key: "b", change: DIFF_STATUS_REMOVED },
      ]);

      expect(store.getState()).toEqual({ a: 123 });
    });

    test("should use the provided patch strategy to patch the state", () => {
      // Create a fake patch strategy
      const patchStrategy = mock((state) => ({
        ...state,
        a: state.a + 1,
      }));
      // Initialize the store
      const store = new Store({
        channelName,
        state: { a: 1, b: 5 },
        patchStrategy,
      });

      expect(store.getState()).toEqual({ a: 1, b: 5 });

      // Patch the state
      store.patchState([]);

      const expectedState = { a: 2, b: 5 };

      // make sure the patch strategy was used
      expect(patchStrategy).toHaveBeenCalledTimes(1);
      // make sure the state got patched
      expect((store as any).state).toEqual(expectedState);
    });
  });

  describe("replaceState()", () => {
    test("should replace the state of the store", () => {
      const store = new Store({ channelName });

      expect(store.getState()).toEqual({});

      store.replaceState({ a: "a" });

      expect(store.getState()).toEqual({ a: "a" });
    });
  });

  describe("getState()", () => {
    test("should get the current state of the Store", () => {
      const store = new Store({ channelName, state: { a: "a" } });

      expect(store.getState()).toEqual({ a: "a" });

      store.replaceState({ b: "b" });

      expect(store.getState()).toEqual({ b: "b" });
    });
  });

  describe("subscribe()", () => {
    test("should register a listener for state changes", () => {
      const store = new Store({ channelName });
      const newState = { b: "b" };

      let callCount = 0;

      store.subscribe(() => {
        callCount += 1;
        expect(store.getState()).toEqual(newState);
      });

      store.replaceState(newState);

      expect(callCount).toBe(1);
    });

    test("should return a function which will unsubscribe the listener", () => {
      const store = new Store({ channelName });
      const listener = mock();
      const unsub = store.subscribe(listener);

      store.replaceState({ b: "b" });

      expect(listener).toHaveBeenCalledTimes(1);

      unsub();

      store.replaceState({ c: "c" });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("dispatch()", () => {
    test("should send a message with the correct dispatch type and payload", () => {
      const spy = spyOn((self as any).chrome.runtime, "sendMessage");
      const store = new Store({ channelName });

      store.dispatch({ a: "a" });

      expect(spy).toHaveBeenCalledTimes(2);

      expect(spy).toHaveBeenNthCalledWith(
        1,
        {
          type: FETCH_STATE_TYPE,
          channelName: "test",
        },
        undefined,
        expect.any(Function)
      );
      expect(spy).toHaveBeenNthCalledWith(
        2,
        {
          type: DISPATCH_TYPE,
          channelName: "test",
          payload: { a: "a" },
        },
        null,
        expect.any(Function)
      );
    });

    test("should serialize payloads before sending", () => {
      const spy = spyOn(self.chrome.runtime, "sendMessage");
      const serializer = spyOn(JSON, "stringify");
      const store = new Store({ channelName, serializer });

      store.dispatch({ a: "a" });

      expect(spy).toHaveBeenCalledTimes(2);

      expect(spy).toHaveBeenNthCalledWith(
        1,
        {
          type: FETCH_STATE_TYPE,
          channelName: "test",
        },
        undefined,
        expect.any(Function)
      );
      expect(spy).toHaveBeenNthCalledWith(
        2,
        {
          type: DISPATCH_TYPE,
          channelName: "test",
          payload: JSON.stringify({ a: "a" }),
        },
        null,
        expect.any(Function)
      );
    });

    test("should return a promise that resolves with successful action", async () => {
      (self as any).chrome.runtime.sendMessage = (
        data: any,
        options: any,
        cb: (response: any) => void
      ) => {
        cb({ value: { payload: "hello" } });
      };

      const store = new Store({ channelName });
      const result = await store.dispatch({ a: "a" });

      expect(result).toBe("hello");
    });

    test("should return a promise that rejects with an action error", async () => {
      (self as any).chrome.runtime.sendMessage = (
        data: any,
        options: any,
        cb: (response: any) => void
      ) => {
        cb({ value: { payload: "hello" }, error: { extraMsg: "test" } });
      };

      const store = new Store({ channelName });
      await expect(store.dispatch({ a: "a" })).rejects.toThrow(Error);
    });

    test("should return a promise that resolves with undefined for an undefined return value", async () => {
      (self as any).chrome.runtime.sendMessage = (
        data: any,
        options: any,
        cb: (response: any) => void
      ) => {
        cb({ value: undefined });
      };

      const store = new Store({ channelName });
      const result = await store.dispatch({ a: "a" });

      expect(result).toBeUndefined();
    });
  });

  describe("when validating options", () => {
    test("should use defaults if no options present", () => {
      expect(() => new Store()).not.toThrow();
    });

    test("should throw an error if serializer is not a function", () => {
      expect(() => {
        new Store({ channelName, serializer: "abc" as any });
      }).toThrow(Error);
    });

    test("should throw an error if deserializer is not a function", () => {
      expect(() => {
        new Store({ channelName, deserializer: "abc" as any });
      }).toThrow(Error);
    });

    test("should throw an error if patchStrategy is not a function", () => {
      expect(() => {
        new Store({ channelName, patchStrategy: "abc" as any });
      }).toThrow(Error);
    });
  });
});
