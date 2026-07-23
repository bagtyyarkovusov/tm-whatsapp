import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// Schema-level assertions for the Phase 1 device-aware migration (issue #22).
// These verify the Prisma schema text directly so they run without a database.
const schema = readFileSync(join(__dirname, "..", "prisma", "schema.prisma"), "utf8");

function modelBlock(name: string): string {
  const match = schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`));
  expect(match, `model ${name} must exist`).toBeTruthy();
  return match![0];
}

describe("Phase 1 schema (issue #22)", () => {
  it("declares the required models", () => {
    for (const model of [
      "Account",
      "Device",
      "OtpChallenge",
      "AuthSession",
      "PrekeyBundle",
      "OneTimePrekey",
      "CiphertextMessage",
    ]) {
      modelBlock(model);
    }
  });

  it("declares the ADR-0011 device lifecycle enum", () => {
    const match = schema.match(/enum DeviceState \{[\s\S]*?\}/);
    expect(match).toBeTruthy();
    for (const state of ["PROVISIONAL", "ACTIVE", "EXPIRED", "REVOKED"]) {
      expect(match![0]).toContain(state);
    }
  });

  it("models the device activation invariants from ADR-0011", () => {
    const device = modelBlock("Device");
    for (const field of [
      "state",
      "platform",
      "installationIdHash",
      "provisionalExpiresAt",
      "activationPayloadHash",
      "activatedAt",
      "revokedAt",
      "terminalReason",
      "lastSeenAt",
    ]) {
      expect(device).toContain(field);
    }
    // Identity key is public-only and nullable until activation.
    expect(device).toMatch(/identityKeyPublic\s+Bytes\?/);
  });

  it("stores only the OTP hash with TTL and attempt counter", () => {
    const otp = modelBlock("OtpChallenge");
    expect(otp).toContain("codeHash");
    expect(otp).toContain("expiresAt");
    expect(otp).toContain("attempts");
  });

  it("models auth-session token families with rotation and reuse detection", () => {
    const session = modelBlock("AuthSession");
    for (const field of [
      "kind",
      "familyId",
      "tokenHash",
      "expiresAt",
      "rotatedAt",
      "reuseDetectedAt",
      "revokedAt",
    ]) {
      expect(session).toContain(field);
    }
    expect(schema).toMatch(/enum AuthSessionKind \{[\s\S]*PROVISIONAL[\s\S]*NORMAL/);
  });

  it("enforces unique prekey IDs per device", () => {
    expect(modelBlock("PrekeyBundle")).toContain("@@unique([deviceId, signedPrekeyId]");
    expect(modelBlock("OneTimePrekey")).toContain("@@unique([deviceId, keyId]");
  });

  it("models idempotent per-device ciphertext queues", () => {
    const msg = modelBlock("CiphertextMessage");
    expect(msg).toContain("clientMessageId");
    expect(msg).toContain("@@unique([senderDeviceId, clientMessageId]");
    expect(msg).toContain("@@index([recipientDeviceId, deliveredAt, createdAt]");
    expect(msg).toContain("@@index([expiresAt]");
    expect(msg).toMatch(/ciphertext\s+Bytes/);
  });

  it("cannot hold plaintext messages, private keys, or cleartext secrets", () => {
    // Strip comments so intent documentation does not trip the assertions.
    const code = schema.replace(/\/\/[^\n]*/g, "").replace(/\/\/\/[^\n]*/g, "");
    // No plaintext message body column.
    expect(code).not.toMatch(/plaintext|message_body|\bbody\b/i);
    // No private key material of any kind.
    expect(code).not.toMatch(/private/i);
    // No cleartext secrets: tokens, OTP codes, and bootstrap secrets are
    // stored as hashes only.
    expect(code).not.toMatch(/\bcode\s+String/);
    expect(code).not.toMatch(/\btoken\s+String/);
    expect(code).not.toMatch(/secret\s+String|secret\s+Bytes/);
  });
});
