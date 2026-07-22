import { z } from "zod";

/**
 * Contracts shared API ↔ mobile (ADR-0004). Vocabulary follows CONTEXT.md:
 * Account, Device, prekey bundle — never "user"/"session" for these.
 */

/** `GET /health` response payload. */
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("api"),
  timestamp: z.string().datetime(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** `GET /health/live` response payload — proves the API process responds. */
export const livenessResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("api"),
});
export type LivenessResponse = z.infer<typeof livenessResponseSchema>;

export const readinessComponentSchema = z.object({
  name: z.enum(["postgres", "redis", "minio"]),
  ready: z.boolean(),
});
export type ReadinessComponent = z.infer<typeof readinessComponentSchema>;

/** `GET /health/ready` response payload — 200 only when all dependencies are usable. */
export const readinessResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  service: z.literal("api"),
  checks: z.array(readinessComponentSchema),
});
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;

/** E.164 phone number, e.g. +9936XXXXXXX — the Account key. */
export const phoneNumberSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "must be E.164");

/** A linked device's public descriptor (never carries private key material). */
export const deviceDescriptorSchema = z.object({
  id: z.string().uuid(),
  label: z.string().nullable(),
});
export type DeviceDescriptor = z.infer<typeof deviceDescriptorSchema>;
