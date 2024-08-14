import { mock, spyOn, test, expect, describe, beforeEach } from "bun:test";
import { Store, applyMiddleware } from "../src";

// Adapt tests from applyMiddleware spec from Redux
describe("applyMiddleware", function () {
  const channelName = "test";
  // simulates redux-thunk middleware
  const thunk =
    ({ dispatch, getState }) =>
    (next) =>
    (action) =>
      typeof action === "function" ? action(dispatch, getState) : next(action);

  beforeEach(function () {
    (global as any).self = {};

    // Mock chrome.runtime API
    self.chrome = {
      runtime: {
        sendMessage: () => {},
        onMessage: {
          addListener: () => {},
        },
      } as any,
    } as any;
  });

  test("warns when dispatching during middleware setup", () => {
    function dispatchingMiddleware(store) {
      store.dispatch({ type: "anything" });
      return (next) => (action) => next(action);
    }
    const middleware = [dispatchingMiddleware];

    expect(() => {
      applyMiddleware(
        new Store({ channelName, state: { a: "a" } }),
        ...middleware
      );
    }).toThrow();
  });

  test("wraps dispatch method with middleware once", () => {
    function testMiddleware(spyOnMethods) {
      return (methods) => {
        spyOnMethods(methods);
        return (next) => (action) => next(action);
      };
    }

    const spy = spyOn({} as any, "spyMethod");
    const store = applyMiddleware(
      new Store({ channelName }),
      testMiddleware(spy),
      thunk
    );

    store.dispatch(() => ({ a: "a" }));

    expect(spy).toHaveBeenCalledTimes(1);

    const spyCall = spy.mock.calls[0];
    expect(spyCall[0]).toHaveProperty("getState");
    expect(spyCall[0]).toHaveProperty("dispatch");
  });

  test("passes recursive dispatches through the middleware chain", async () => {
    (self as any).chrome.runtime.sendMessage = (data, options, cb) => {
      cb(data.payload);
    };
    function test(spyOnMethods) {
      return () => (next) => (action) => {
        spyOnMethods(action);
        return next(action);
      };
    }
    function asyncActionCreator(data) {
      return (dispatch) =>
        new Promise((resolve) =>
          setTimeout(() => {
            dispatch(() => data);
            resolve(void 0);
          }, 0)
        );
    }

    const spy = spyOn({} as any, "spyMethod");
    const store = applyMiddleware(new Store({ channelName }), test(spy), thunk);

    await store.dispatch(asyncActionCreator({ a: "a" }));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test("passes through all arguments of dispatch calls from within middleware", () => {
    const spy = mock(() => {});
    const testCallArgs = ["test"];

    const multiArgMiddleware = () => (next) => (action) => {
      if (Array.isArray(action.args)) {
        return action.func(...action.args);
      }
      return next(action);
    };

    const dummyMiddleware =
      ({ dispatch }) =>
      (next) =>
      (action) => {
        return dispatch({ func: action, args: testCallArgs });
      };

    const store = applyMiddleware(
      new Store({ channelName }),
      multiArgMiddleware,
      dummyMiddleware
    );

    store.dispatch(spy);
    expect(spy).toHaveBeenCalledWith(...testCallArgs);
  });

  test("should be able to access getState from thunk", () => {
    const middleware = [thunk];
    const store = applyMiddleware(
      new Store({ channelName, state: { a: "a" } }),
      ...middleware
    );

    expect(store.getState()).toEqual({ a: "a" });
    store.dispatch((dispatch, getState) => {
      expect(getState()).toEqual({ a: "a" });
    });
  });
});
