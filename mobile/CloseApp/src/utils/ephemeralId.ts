import { sha256 } from '@noble/hashes/sha256';

export function deriveEphemeralId(deviceUuid: string, rotationEpoch: number, deviceSecret: Uint8Array): Uint8Array {
  const input = new TextEncoder().encode(`${deviceUuid}:${rotationEpoch}`);
  const concat = new Uint8Array(input.length + deviceSecret.length);
  concat.set(input, 0);
  concat.set(deviceSecret, input.length);
  const digest = sha256(concat);
  return Uint8Array.from(digest.slice(0, 8));
}

