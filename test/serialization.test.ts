import { test, expect, mock } from "bun:test";
import { withSerializer, withDeserializer } from "../src/serialization";

test("serialization functions", () => {
  test("#withSerializer", () => {
    const jsonSerialize = (payload) => JSON.stringify(payload);

    let payload, message, serializedMessage, sender;

    function setup() {
      payload = {
        message: "Hello World",
        numbers: [1, 2, 3],
      };

      message = {
        type: "TEST",
        payload,
      };

      serializedMessage = {
        type: "TEST",
        payload: jsonSerialize(payload),
      };

      sender = mock(() => {});
    }

    test("should serialize the message payload before sending", () => {
      setup();
      const serializedSender = mock(withSerializer(jsonSerialize)(sender));

      serializedSender(message);

      expect(sender.mock.calls.length).toBe(1);
      expect(serializedSender.mock.calls.length).toBe(1);
      expect(sender.mock.calls[0][0]).toEqual(serializedMessage);
    });

    test("should enforce the number of arguments", () => {
      setup();
      const serializedSender = withSerializer(jsonSerialize)(sender, 1);

      expect(() => serializedSender(message)).toThrow();
      expect(sender.mock.calls.length).toBe(0);
    });

    test("should extract the correct argument index", () => {
      setup();
      const serializedSender = mock(withSerializer(jsonSerialize)(sender, 1));

      serializedSender(null, message);

      expect(sender.mock.calls.length).toBe(1);
      expect(serializedSender.mock.calls.length).toBe(1);
      expect(sender.mock.calls[0][1]).toEqual(serializedMessage);
    });

    test("should have the same result when the same message is sent twice", () => {
      setup();
      const serializedSender = mock(withSerializer(jsonSerialize)(sender));

      serializedSender(message);
      const firstResult = structuredClone(sender.mock.calls[0][0]);

      serializedSender(message);
      const secondResult = structuredClone(sender.mock.calls[1][0]);

      expect(sender.mock.calls.length).toBe(2);
      expect(serializedSender.mock.calls.length).toBe(2);
      expect(firstResult).toEqual(secondResult);
    });

    test("should not modify the original message", () => {
      setup();
      const serializedSender = mock(withSerializer(jsonSerialize)(sender));

      serializedSender(message);

      expect(message.payload).toEqual(payload);
      expect(sender.mock.calls[0][0]).not.toBe(message);
    });
  });

  test("#withDeserializer", () => {
    const jsonDeserialize = (payload) => JSON.parse(payload);

    let listeners, addListener, onMessage;
    let payload, message, deserializedMessage, listener, serializedAddListener;

    function setup() {
      listeners = [];
      addListener = (listener) => {
        listeners.push(listener);
      };
      onMessage = (message) => {
        listeners.forEach((listener) => {
          listener(message);
        });
      };

      payload = JSON.stringify({
        message: "Hello World",
        numbers: [1, 2, 3],
      });

      message = {
        type: "TEST",
        payload,
      };

      deserializedMessage = {
        type: "TEST",
        payload: jsonDeserialize(payload),
      };

      listener = mock(() => {});
      serializedAddListener = mock(
        withDeserializer(jsonDeserialize)(addListener)
      );
    }

    test("should deserialize the message payload before the callback", () => {
      setup();
      serializedAddListener(listener);
      onMessage(message);

      expect(listener.mock.calls.length).toBe(1);
      expect(listener.mock.calls[0][0]).toEqual(deserializedMessage);
    });

    test("should only add the listener once", () => {
      setup();
      serializedAddListener(listener);
      onMessage(message);
      onMessage(message);

      expect(listener.mock.calls.length).toBe(2);
      expect(serializedAddListener.mock.calls.length).toBe(1);
    });

    test("should have the same result when the same message is received twice", () => {
      setup();
      serializedAddListener(listener);

      onMessage(message);
      const firstResult = structuredClone(listener.mock.calls[0][0]);

      onMessage(message);
      const secondResult = structuredClone(listener.mock.calls[1][0]);

      expect(firstResult).toEqual(secondResult);
    });

    test("should not modify the original incoming message", () => {
      setup();
      serializedAddListener(listener);
      onMessage(message);

      expect(message.payload).toEqual(payload);
      expect(listener.mock.calls[0][0]).not.toBe(message);
    });

    test("should not deserialize messages it isn't supposed to", () => {
      setup();
      const shouldDeserialize = (message) => message.type === "DESERIALIZE_ME";

      serializedAddListener(listener, shouldDeserialize);
      onMessage(message);

      expect(listener.mock.calls[0][0]).toEqual(message);
    });

    test("should deserialize messages it is supposed to", () => {
      setup();
      const shouldDeserialize = (message) => message.type === "TEST";

      serializedAddListener(listener, shouldDeserialize);
      onMessage(message);

      expect(listener.mock.calls[0][0]).toEqual(deserializedMessage);
    });
  });
});
