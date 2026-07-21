/**
 * Signal Protocol interface barrel (ADR-0003).
 *
 * Type-only contracts for the E2EE layer: the native `libsignal-client`
 * Expo module implements these on mobile; a pure-TS fallback can sit behind
 * the same interface. The server never implements these — it only stores
 * prekey bundles and relays ciphertext messages (CONTEXT.md invariant #1).
 *
 * No runtime code lives here yet; implementations land with Phase 1.
 */

/** A prekey bundle as uploaded to / fetched from the server (public keys only). */
export interface PrekeyBundle {
  readonly deviceId: string;
  readonly identityKeyPublic: Uint8Array;
  readonly signedPrekeyId: number;
  readonly signedPrekey: Uint8Array;
  readonly signedPrekeySignature: Uint8Array;
  readonly oneTimePrekeyId?: number;
  readonly oneTimePrekey?: Uint8Array;
}

/** Own-device identity: keypair generation and prekey bundle assembly. */
export interface IdentityService {
  /** Generate the device's long-term Signal identity keypair at install time. */
  generateIdentityKeypair(): Promise<void>;
  /** Assemble a fresh prekey bundle (signed + one-time prekeys) for upload. */
  createPrekeyBundle(deviceId: string): Promise<PrekeyBundle>;
}

/** X3DH session establishment + Double Ratchet message encryption. */
export interface SessionCipher {
  /** Establish a Signal session with a remote device from its prekey bundle. */
  establishSession(remoteDeviceId: string, bundle: PrekeyBundle): Promise<void>;
  /** Encrypt plaintext into a ciphertext message for a remote device. */
  encrypt(remoteDeviceId: string, plaintext: Uint8Array): Promise<Uint8Array>;
  /** Decrypt a ciphertext message from a remote device. */
  decrypt(remoteDeviceId: string, ciphertext: Uint8Array): Promise<Uint8Array>;
}

/** Local persistence for Signal protocol state (identity, sessions, prekeys). */
export interface PreKeyStore {
  saveSignedPrekey(id: number, record: Uint8Array): Promise<void>;
  loadSignedPrekey(id: number): Promise<Uint8Array | null>;
  saveOneTimePrekey(id: number, record: Uint8Array): Promise<void>;
  /** Returns null once the prekey has been consumed (one-time semantics). */
  takeOneTimePrekey(id: number): Promise<Uint8Array | null>;
}
