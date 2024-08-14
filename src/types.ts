export interface Message<T = any> {
  payload?: T;
  [key: string]: any;
}

export type Listener<T> = (message: Message<T>, ...args: any[]) => void;

export type AddListenerFn<T> = (listener: Listener<T>) => void;

export type ShouldDeserialize = (message: Message, ...args: any[]) => boolean;

export type Transformer = (payload: any) => any;
