import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { getBrowserAPI } from "../src/util";

describe("getBrowserAPI()", async () => {
  beforeEach(() => {
    // Reset the global object before each test
    (global as any).self = {};
  });

  afterEach(() => {
    // Clean up after each test
    delete (global as any).self.chrome;
    delete (global as any).self.browser;
  });

  test("should return the self chrome API if present", () => {
    (self as any).chrome = {
      isChrome: true,
    };
    (self as any).browser = undefined;

    const browserAPI = getBrowserAPI();

    expect(browserAPI).toBe((self as any).chrome);
  });

  test("should return the self browser API if chrome is not present", () => {
    (self as any).chrome = undefined;
    (self as any).browser = {
      isBrowser: true,
    };

    const browserAPI = getBrowserAPI();

    expect(browserAPI).toBe((self as any).browser);
  });

  test("should throw an error if neither the chrome or browser API is present", () => {
    (self as any).chrome = undefined;
    (self as any).browser = undefined;

    expect(() => getBrowserAPI()).toThrow();
  });
});
