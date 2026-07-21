import { describe, expect, it } from "vitest";

import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns a contract-valid health payload", () => {
    const controller = new HealthController();
    const body = controller.getHealth();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("api");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });
});
