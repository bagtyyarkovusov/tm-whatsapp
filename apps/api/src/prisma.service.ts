import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@tm/db";

/**
 * Single Prisma connection for the API process. Wired to packages/db per
 * ADR-0004; connects lazily on module init so `/health` answers even when
 * the database is unreachable (portability rules, ADR-0001).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    if (process.env.DATABASE_URL) {
      try {
        await this.$connect();
      } catch {
        this.logger.warn(
          "Initial database connection failed; API will start and /health/ready will report degraded",
        );
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
