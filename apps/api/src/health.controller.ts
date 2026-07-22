import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from "@nestjs/common";
import {
  healthResponseSchema,
  livenessResponseSchema,
  readinessResponseSchema,
  type HealthResponse,
  type LivenessResponse,
  type ReadinessResponse,
} from "@tm/contracts";

import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthResponse {
    // Validated against the shared contract so API ↔ mobile never drift.
    return healthResponseSchema.parse({
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    });
  }

  @Get("live")
  @HttpCode(HttpStatus.OK)
  getLiveness(): LivenessResponse {
    return livenessResponseSchema.parse({
      status: "ok",
      service: "api",
    });
  }

  @Get("ready")
  async getReadiness(): Promise<ReadinessResponse> {
    const result = await this.healthService.getReadiness();
    const parsed = readinessResponseSchema.parse(result);
    if (parsed.status !== "ok") {
      throw new ServiceUnavailableException(parsed);
    }
    return parsed;
  }
}
