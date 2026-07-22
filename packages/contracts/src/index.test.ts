import { describe, expect, it } from "vitest";

import {
  healthResponseSchema,
  livenessResponseSchema,
  phoneNumberSchema,
  readinessResponseSchema,
} from "./index";

describe("@tm/contracts", () => {
  it("accepts a well-formed health response", () => {
    const parsed = healthResponseSchema.parse({
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    });
    expect(parsed.status).toBe("ok");
  });

  it("accepts liveness and readiness responses", () => {
    const live = livenessResponseSchema.parse({ status: "ok", service: "api" });
    expect(live.status).toBe("ok");

    const ready = readinessResponseSchema.parse({
      status: "ok",
      service: "api",
      checks: [
        { name: "postgres", ready: true },
        { name: "redis", ready: true },
        { name: "minio", ready: true },
      ],
    });
    expect(ready.status).toBe("ok");
    expect(ready.checks).toHaveLength(3);
  });

  it("rejects readiness responses with unknown component names", () => {
    const result = readinessResponseSchema.safeParse({
      status: "ok",
      service: "api",
      checks: [{ name: "kafka", ready: true }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts E.164 phone numbers and rejects local formats", () => {
    expect(phoneNumberSchema.safeParse("+99361234567").success).toBe(true);
    expect(phoneNumberSchema.safeParse("061234567").success).toBe(false);
  });
});
