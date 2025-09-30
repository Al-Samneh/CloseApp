export type EphemeralPayload = {
  version: number; // 1 byte
  ephemeralId: Uint8Array; // 8 bytes
  fingerprint: Uint8Array; // 8 bytes
  flags: number; // 1 byte
};

export function packPayload(p: EphemeralPayload): Uint8Array {
  if (p.ephemeralId.length !== 8 || p.fingerprint.length !== 8) {
    throw new Error('Invalid field length');
  }
  const buf = new Uint8Array(18);
  buf[0] = p.version & 0xff;
  buf.set(p.ephemeralId, 1);
  buf.set(p.fingerprint, 9);
  buf[17] = p.flags & 0xff;
  return buf;
}

export function unpackPayload(data: Uint8Array): EphemeralPayload | null {
  if (!data || data.length < 18) return null;
  return {
    version: data[0],
    ephemeralId: data.slice(1, 9),
    fingerprint: data.slice(9, 17),
    flags: data[17],
  };
}

