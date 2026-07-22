import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

function makeController(
  readiness: Awaited<ReturnType<HealthService["getReadiness"]>>,
): HealthController {
  const healthService = {
    getReadiness: () => readiness,
  } as unknown as HealthService;
  return new HealthController(healthService);
}

describe("HealthController", () => {
  it("returns a contract-valid health payload", () => {
    const controller = makeController({
      status: "ok",
      service: "api",
      checks: [
        { name: "postgres", ready: true },
        { name: "redis", ready: true },
        { name: "minio", ready: true },
      ],
    });
    const body = controller.getHealth();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("api");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it("returns 200 liveness regardless of dependencies", () => {
    const controller = makeController({
      status: "degraded",
      service: "api",
      checks: [
        { name: "postgres", ready: false },
        { name: "redis", ready: false },
        { name: "minio", ready: false },
      ],
    });
    const body = controller.getLiveness();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("api");
  });

  it("returns readiness when all dependencies are up", async () => {
    const controller = makeController({
      status: "ok",
      service: "api",
      checks: [
        { name: "postgres", ready: true },
        { name: "redis", ready: true },
        { name: "minio", ready: true },
      ],
    });
    const body = await controller.getReadiness();
    expect(body.status).toBe("ok");
    expect(body.checks.every((check) => check.ready)).toBe(true);
  });

  it("throws ServiceUnavailableException when any dependency is down", async () => {
    const controller = makeController({
      status: "degraded",
      service: "api",
      checks: [
        { name: "postgres", ready: true },
        { name: "redis", ready: false },
        { name: "minio", ready: true },
      ],
    });
    await expect(controller.getReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
