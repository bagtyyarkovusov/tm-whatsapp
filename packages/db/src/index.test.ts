import { describe, expect, it } from "vitest";

import { PrismaClient } from "./index";

describe("@tm/db", () => {
  it("exposes the PrismaClient constructor", () => {
    expect(typeof PrismaClient).toBe("function");
  });
});
