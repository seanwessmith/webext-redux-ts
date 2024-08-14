import {
  Message,
  Listener,
  AddListenerFn,
  ShouldDeserialize,
  Transformer,
} from "./types";

export const noop: Transformer = (payload: any) => payload;

const transformPayload = <T>(
  message: Message<T>,
  transformer: Transformer = noop
): Message<T> => ({
  ...message,
  // If the message has a payload, transform it. Otherwise,
  // just return a copy of the message.
  // We return a copy rather than the original message so that we're not
  // mutating the original action object.
  ...(message.payload ? { payload: transformer(message.payload) } : {}),
});

const deserializeListener = <T>(
  listener: Listener<T>,
  deserializer: Transformer = noop,
  shouldDeserialize?: ShouldDeserialize
): Listener<T> => {
  // If a shouldDeserialize function is passed, return a function that uses it
  // to check if any given message payload should be deserialized
  if (shouldDeserialize) {
    return (message, ...args) => {
      if (shouldDeserialize(message, ...args)) {
        return listener(transformPayload(message, deserializer), ...args);
      }
      return listener(message, ...args);
    };
  }
  // Otherwise, return a function that tries to deserialize on every message
  return (message, ...args) =>
    listener(transformPayload(message, deserializer), ...args);
};

/**
 * A function returned from withDeserializer that, when called, wraps addListenerFn with the
 * deserializer passed to withDeserializer.
 * @name AddListenerDeserializer
 * @function
 * @param {Function} addListenerFn The add listener function to wrap.
 * @returns {DeserializedAddListener}
 */

/**
 * A wrapped add listener function that registers the given listener.
 * @name DeserializedAddListener
 * @function
 * @param {Function} listener The listener function to register. It should expect the (optionally)
 * deserialized message as its first argument.
 * @param {Function} [shouldDeserialize] A function that takes the arguments passed to the listener
 * and returns whether the message payload should be deserialized. Not all messages (notably, messages
 * this listener doesn't care about) should be attempted to be deserialized.
 */

/**
 * Given a deserializer, returns an AddListenerDeserializer function that that takes an add listener
 * function and returns a DeserializedAddListener that automatically deserializes message payloads.
 * Each message listener is expected to take the message as its first argument.
 * @param {Function} deserializer A function that deserializes a message payload.
 * @returns {AddListenerDeserializer}
 * Example Usage:
 *   const withJsonDeserializer = withDeserializer(payload => JSON.parse(payload));
 *   const deserializedChromeListener = withJsonDeserializer(chrome.runtime.onMessage.addListener);
 *   const shouldDeserialize = (message) => message.type === 'DESERIALIZE_ME';
 *   deserializedChromeListener(message => console.log("Payload:", message.payload), shouldDeserialize);
 *   chrome.runtime.sendMessage("{'type:'DESERIALIZE_ME','payload':{'prop':4}}");
 *   //Payload: { prop: 4 };
 *   chrome.runtime.sendMessage("{'payload':{'prop':4}}");
 *   //Payload: "{'prop':4}";
 */

export interface AddListenerDeserializer {
  <T>(addListenerFn: AddListenerFn<T>): DeserializedAddListener<T>;
}

export interface DeserializedAddListener<T> {
  (listener: Listener<T>, shouldDeserialize?: ShouldDeserialize): void;
}
export const withDeserializer =
  (deserializer: Transformer = noop): AddListenerDeserializer =>
  <T>(addListenerFn: AddListenerFn<T>): DeserializedAddListener<T> =>
  (listener: Listener<T>, shouldDeserialize?: ShouldDeserialize) =>
    addListenerFn(
      deserializeListener(listener, deserializer, shouldDeserialize)
    );

/**
 * Given a serializer, returns a function that takes a message sending
 * function as its sole argument and returns a wrapped message sender that
 * automaticaly serializes message payloads. The message sender
 * is expected to take the message as its first argument, unless messageArgIndex
 * is nonzero, in which case it is expected in the position specified by messageArgIndex.
 * @param {Function} serializer A function that serializes a message payload
 * Example Usage:
 *   const withJsonSerializer = withSerializer(payload => JSON.stringify(payload))
 *   const serializedChromeSender = withJsonSerializer(chrome.runtime.sendMessage)
 *   chrome.runtime.addListener(message => console.log("Payload:", message.payload))
 *   serializedChromeSender({ payload: { prop: 4 }})
 *   //Payload: "{'prop':4}"
 */
export interface MessageSender {
  (...args: any[]): any;
}

export const withSerializer =
  (serializer = noop) =>
  <T extends MessageSender>(sendMessageFn: T, messageArgIndex = 0) => {
    return (...args: any[]) => {
      if (args.length <= messageArgIndex) {
        throw new Error(
          `Message in request could not be serialized. ` +
            `Expected message in position ${messageArgIndex} but only received ${args.length} args.`
        );
      }
      args[messageArgIndex] = transformPayload(
        args[messageArgIndex],
        serializer
      );
      return sendMessageFn(...args);
    };
  };
