import { describe, expect, it } from "vitest";

import type { IdentityService, PrekeyBundle, PreKeyStore, SessionCipher } from "./index";

describe("@tm/crypto interface barrel", () => {
  it("exposes the ADR-0003 Signal Protocol interfaces as types", () => {
    // Compile-time only: if these interfaces stop being exported, this file
    // fails typecheck. Runtime implementations land with Phase 1.
    const bundle: PrekeyBundle = {
      deviceId: "device-1",
      identityKeyPublic: new Uint8Array(32),
      signedPrekeyId: 1,
      signedPrekey: new Uint8Array(32),
      signedPrekeySignature: new Uint8Array(64),
    };
    expect(bundle.deviceId).toBe("device-1");

    type _Interfaces = [IdentityService, SessionCipher, PreKeyStore];
    const _check: _Interfaces | null = null;
    expect(_check).toBeNull();
  });
});
