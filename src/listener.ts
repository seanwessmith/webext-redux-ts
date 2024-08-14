export type ListenerFunction = (
  message: any,
  sender: chrome.runtime.MessageSender | string,
  sendResponse: (response?: any) => void
) => void | boolean;

interface DeferredListener {
  setListener: (fn: ListenerFunction) => void;
  listener: (
    message: any,
    sender: chrome.runtime.MessageSender | string,
    sendResponse: (response?: any) => void
  ) => boolean;
}

export const createDeferredListener = (): DeferredListener => {
  let resolve: (fn: ListenerFunction) => void = () => {};
  const fnPromise: Promise<ListenerFunction> = new Promise((resolve_) => {
    resolve = resolve_;
  });

  const listener: DeferredListener["listener"] = (
    message,
    sender,
    sendResponse
  ) => {
    fnPromise.then((fn) => {
      fn(message, sender, sendResponse);
    });

    // Allow response to be async
    return true;
  };

  return { setListener: resolve, listener };
};
