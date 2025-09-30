export type EphemeralPayload = {
  version: number; // 1 byte
  ephemeralId: Uint8Array; // 8 bytes
  fingerprint: Uint8Array; // 2 bytes (reduced from 8 to fit in 12 bytes total)
  flags: number; // 1 byte
};

export function packPayload(p: EphemeralPayload): Uint8Array {
  if (p.ephemeralId.length !== 8) {
    throw new Error('Invalid ephemeralId length');
  }
  if (p.fingerprint.length < 2) {
    throw new Error('Invalid fingerprint length');
  }
  // Total: 12 bytes (fits in 24 hex chars for iOS local name)
  const buf = new Uint8Array(12);
  buf[0] = p.version & 0xff;
  buf.set(p.ephemeralId, 1);
  buf.set(p.fingerprint.slice(0, 2), 9); // Only use first 2 bytes of fingerprint
  buf[11] = p.flags & 0xff;
  return buf;
}

export function unpackPayload(data: Uint8Array): EphemeralPayload | null {
  if (!data || data.length < 12) return null;
  return {
    version: data[0],
    ephemeralId: data.slice(1, 9),
    fingerprint: data.slice(9, 11), // 2 bytes
    flags: data[11],
  };
}

