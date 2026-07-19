# ADR-0008: Media pipeline — client-side encrypt + compress, dumb ciphertext server

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: bagtyyar + Claude (founding grilling session)

## Context

Phase 2 ships photo/video/file sending that must work on ~2 Mbps **while staying E2EE**. One consequence drives the whole design: if the server cannot see media, the server cannot transcode it — no server-side ffmpeg renditions, no adaptive HLS. Adaptation must happen on the *sender's* phone, at send time.

## Decision

**The WhatsApp model, tuned for 2 Mbps:**

| Stage | Design |
|---|---|
| Encryption | Per-attachment random **AES-256 key**; file encrypted **client-side before upload**; key delivered inside the E2EE Signal message (ADR-0003). Server stores opaque ciphertext. |
| Compression (sender) | Images → max 1600px WebP (~100–300 KB). Videos → on-device transcode to **H.264 480p @ ~600 kbps** (`react-native-compressor`, already used in auto.tm). Documents → raw bytes. |
| Thumbnails | ~5 KB blurred preview, encrypted, sent **inline in the message** — chat renders instantly, full media lazy-loads. |
| Upload | **S3 multipart with presigned URLs**, 5 MB parts, per-part retry, pause/resume, OS background upload task. Resumability on flaky 2 Mbps with no extra infra (MinIO-native). |
| Download | HTTP range requests on ciphertext, progressive video play, **auto-download rules**: mobile data = photos only; everything else tap-to-download. |
| Server role | Dumb encrypted object storage + push fanout. Server-side ffmpeg exists only for non-E2EE content (e.g., avatar processing). |
| Limits (v1) | 100 MB per file. Videos beyond the inline-transcode cap send as "documents" (no transcode). |

**Philosophical commitment:** the sender's client is the transcoder. Compression quality is our code, identical on every send, and the recipient's experience is deterministic on 2 Mbps. The thing we give up — server-side adaptive streaming — cannot exist without breaking E2EE.

## Consequences

### Positive
- E2EE covers media, not just text — no plaintext media ever touches our infrastructure.
- Resumable multipart keeps big sends alive across TM-grade network drops.
- MinIO/ciphertext/ranges are boring, portable, ADR-0001-compliant.

### Negative / accepted costs
- Low-end sender devices pay CPU/battery for transcode (mitigated by hardware H.264 encode).
- One rendition only: a recipient on a great connection gets the 2 Mbps-tuned file. Accepted — deterministic beats optimal here.
- 100 MB cap will frustrate someone eventually; revisit with usage data.

## References

- Related: ADR-0003 (keys inside Signal messages), ADR-0001 (MinIO hosting), ADR-0002 (Phase 2)
