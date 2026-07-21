import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@tm/db";

/**
 * Single Prisma connection for the API process. Wired to packages/db per
 * ADR-0004; connects lazily on module init so `/health` answers even when
 * the database is unreachable (portability rules, ADR-0001).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    if (process.env.DATABASE_URL) {
      await this.$connect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
