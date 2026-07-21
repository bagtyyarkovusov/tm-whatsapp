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

/** E.164 phone number, e.g. +9936XXXXXXX — the Account key. */
export const phoneNumberSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "must be E.164");

/** A linked device's public descriptor (never carries private key material). */
export const deviceDescriptorSchema = z.object({
  id: z.string().uuid(),
  label: z.string().nullable(),
});
export type DeviceDescriptor = z.infer<typeof deviceDescriptorSchema>;
