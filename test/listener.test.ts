import { test, expect, describe } from "bun:test";
import { createDeferredListener, ListenerFunction } from "../src/listener";

// Define MessageSender type if it's not already defined in your source files
type MessageSender = {
  id?: string;
  // Add other properties that MessageSender might have
};

describe("createDeferredListener", () => {
  test("queues calls to the listener", async () => {
    const { setListener, listener } = createDeferredListener();
    const calls: Array<[any, MessageSender | string, (response: any) => void]> =
      [];

    const spy: ListenerFunction = (message, sender, sendResponse) => {
      calls.push([message, sender, sendResponse]);
    };

    // Trigger a couple of events
    listener("message", "sender", () => {});
    listener("message2", { id: "sender2" }, () => {});

    // Listener should receive previous messages
    setListener(spy);

    // Trigger more events
    listener("message3", "sender3", () => {});
    listener("message4", { id: "sender4" }, () => {});

    await Promise.resolve();

    expect(calls.length).toBe(4);
    expect(calls[0][0]).toBe("message");
    expect(calls[0][1]).toBe("sender");
    expect(typeof calls[0][2]).toBe("function");

    expect(calls[1][0]).toBe("message2");
    expect(calls[1][1]).toEqual({ id: "sender2" });
    expect(typeof calls[1][2]).toBe("function");

    expect(calls[2][0]).toBe("message3");
    expect(calls[2][1]).toBe("sender3");
    expect(typeof calls[2][2]).toBe("function");

    expect(calls[3][0]).toBe("message4");
    expect(calls[3][1]).toEqual({ id: "sender4" });
    expect(typeof calls[3][2]).toBe("function");
  });
});
