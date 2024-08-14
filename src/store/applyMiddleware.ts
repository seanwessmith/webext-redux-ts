// Function taken from redux source
// https://github.com/reactjs/redux/blob/master/src/compose.js
function compose<T>(...funcs: Array<(arg: T) => T>): (arg: T) => T {
  if (funcs.length === 0) {
    return (arg: T) => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce(
    (a, b) =>
      (...args: T[]) =>
        a(b(...args as [T]))
  );
}

interface Store {
  getState: () => any;
  dispatch: (...args: any[]) => any;
}

interface MiddlewareAPI {
  getState: () => any;
  dispatch: (...args: any[]) => any;
}

type Middleware = (
  api: MiddlewareAPI
) => (next: (action: any) => any) => (action: any) => any;

// Based on redux implementation of applyMiddleware to support all standard
// redux middlewares
export default function applyMiddleware(
  store: Store,
  ...middlewares: Middleware[]
): Store {
  let dispatch: (...args: any[]) => any = () => {
    throw new Error(
      "Dispatching while constructing your middleware is not allowed. " +
        "Other middleware would not be applied to this dispatch."
    );
  };

  const middlewareAPI: MiddlewareAPI = {
    getState: store.getState.bind(store),
    dispatch: (...args) => dispatch(...args),
  };

  const chain = middlewares.map((middleware) => middleware(middlewareAPI));
  dispatch = compose<(...args: any[]) => any>(...chain)(store.dispatch);

  return {
    ...store,
    dispatch,
  };
}
