import * as WebExtPolyfill from 'webextension-polyfill';

declare global {
  interface Window {
    browser: typeof WebExtPolyfill;
  }
  
  const browser: typeof WebExtPolyfill;
}

// This empty export is necessary to make this a module
export {};