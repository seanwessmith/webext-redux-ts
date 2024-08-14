import { test, expect, mock } from "bun:test";
import { alias } from "../src";

const getSessionAction = {
  type: "GET_SESSION",
  payload: {
    withUser: true,
  },
};

const getSessionAlias = mock(() => ({
  type: "GET_SESSION_ALIAS",
  payload: {
    withUser: true,
    alias: true,
  },
}));

const aliases = alias({
  GET_SESSION: getSessionAlias,
});

test("alias() should call an alias when matching action type", () => {
  const next = mock();

  aliases()(next)(getSessionAction);

  expect(next).toHaveBeenCalledTimes(1);
  const calledAction = next.mock.calls[0][0];
  expect(calledAction.type).toBe("GET_SESSION_ALIAS");
  expect(calledAction.payload).toEqual({
    withUser: true,
    alias: true,
  });
});

test("alias() should call original action if no matching alias", () => {
  const next = mock();
  const nonAliasedAction = {
    type: "ACTION_2",
    payload: {
      actionStuff: true,
    },
  };

  aliases()(next)(nonAliasedAction);

  expect(next).toHaveBeenCalledTimes(1);
  const calledAction = next.mock.calls[0][0];
  expect(calledAction.type).toBe("ACTION_2");
  expect(calledAction.payload).toEqual({
    actionStuff: true,
  });
});
