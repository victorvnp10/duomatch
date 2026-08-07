import { describe, expect, it } from "vitest";

import { isPositiveInteger } from "./index.js";

describe("isPositiveInteger", () => {
  it("accepts a positive integer", () => {
    expect(isPositiveInteger(1)).toBe(true);
  });

  it("rejects zero", () => {
    expect(isPositiveInteger(0)).toBe(false);
  });

  it("rejects a negative integer", () => {
    expect(isPositiveInteger(-1)).toBe(false);
  });

  it("rejects a non-integer number", () => {
    expect(isPositiveInteger(1.5)).toBe(false);
  });
});
