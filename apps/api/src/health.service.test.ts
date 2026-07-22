import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HealthService } from "./health.service";
import { type PrismaService } from "./prisma.service";

describe("HealthService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("bounds a stalled Postgres readiness probe", async () => {
    const prisma = {
      $queryRaw: () => new Promise<never>(() => undefined),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    const result = service.checkPostgres();
    await vi.advanceTimersByTimeAsync(3000);

    await expect(result).resolves.toBe(false);
  });
});
