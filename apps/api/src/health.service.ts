import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";
import { type ReadinessComponent, type ReadinessResponse } from "@tm/contracts";
import Redis from "ioredis";

import { PrismaService } from "./prisma.service";

const DEPENDENCY_TIMEOUT_MS = 3000;

/**
 * Dependency readiness probes for `/health/ready`.
 *
 * Each probe is bounded, swallows errors, and never exposes credentials or
 * connection strings in thrown errors (ADR-0001 portability rules).
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly redis: Redis | null = null;
  private readonly s3: S3Client | null = null;

  constructor(private readonly prisma: PrismaService) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        connectTimeout: DEPENDENCY_TIMEOUT_MS,
        commandTimeout: DEPENDENCY_TIMEOUT_MS,
        maxRetriesPerRequest: 0,
      });
    }

    const s3Endpoint = process.env.S3_ENDPOINT;
    const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID;
    const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (s3Endpoint && s3AccessKeyId && s3SecretAccessKey) {
      this.s3 = new S3Client({
        endpoint: s3Endpoint,
        region: process.env.S3_REGION ?? "us-east-1",
        credentials: {
          accessKeyId: s3AccessKeyId,
          secretAccessKey: s3SecretAccessKey,
        },
        forcePathStyle: true,
        requestHandler: {
          requestTimeout: DEPENDENCY_TIMEOUT_MS,
        },
      });
    }
  }

  private async withTimeout<T>(operation: Promise<T>): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error("dependency readiness probe timed out")),
        DEPENDENCY_TIMEOUT_MS,
      );
    });

    try {
      return await Promise.race([operation, deadline]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  async checkPostgres(): Promise<boolean> {
    try {
      await this.withTimeout(this.prisma.$queryRaw`SELECT 1`);
      return true;
    } catch {
      this.logger.warn("Postgres readiness probe failed");
      return false;
    }
  }

  async checkRedis(): Promise<boolean> {
    if (!this.redis) {
      return false;
    }
    try {
      await this.withTimeout(this.redis.ping());
      return true;
    } catch {
      try {
        await this.withTimeout(
          (async () => {
            await this.redis!.connect();
            await this.redis!.ping();
          })(),
        );
        return true;
      } catch {
        this.logger.warn("Redis readiness probe failed");
        return false;
      }
    }
  }

  async checkMinio(): Promise<boolean> {
    if (!this.s3) {
      return false;
    }
    try {
      await this.withTimeout(this.s3.send(new ListBucketsCommand({})));
      return true;
    } catch {
      this.logger.warn("MinIO readiness probe failed");
      return false;
    }
  }

  async getReadiness(): Promise<ReadinessResponse> {
    const [postgres, redis, minio] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkMinio(),
    ]);

    const checks: ReadinessComponent[] = [
      { name: "postgres", ready: postgres },
      { name: "redis", ready: redis },
      { name: "minio", ready: minio },
    ];
    const allReady = checks.every((check) => check.ready);

    return {
      status: allReady ? "ok" : "degraded",
      service: "api",
      checks,
    };
  }
}
