import { describe, expect, it } from "vitest";

import { healthResponseSchema, phoneNumberSchema } from "./index";

describe("@tm/contracts", () => {
  it("accepts a well-formed health response", () => {
    const parsed = healthResponseSchema.parse({
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    });
    expect(parsed.status).toBe("ok");
  });

  it("accepts E.164 phone numbers and rejects local formats", () => {
    expect(phoneNumberSchema.safeParse("+99361234567").success).toBe(true);
    expect(phoneNumberSchema.safeParse("061234567").success).toBe(false);
  });
});
