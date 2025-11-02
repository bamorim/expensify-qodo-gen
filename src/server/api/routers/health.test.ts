import { describe, it, expect } from "vitest";

// Minimal sanity test to ensure Vitest runs in test env
// and Node environment for server-side tests

describe("vitest sanity", () => {
  it("process.env.NODE_ENV should be 'test' when running tests", () => {
    expect(process.env.NODE_ENV).toBe("test");
  });
});
