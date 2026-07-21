import { Controller, Get } from "@nestjs/common";
import { healthResponseSchema, type HealthResponse } from "@tm/contracts";

@Controller("health")
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    // Validated against the shared contract so API ↔ mobile never drift.
    return healthResponseSchema.parse({
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    });
  }
}
