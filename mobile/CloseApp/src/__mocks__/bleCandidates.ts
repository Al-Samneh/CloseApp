export const mockCandidates = [
  { payloadBase64: Buffer.from(Uint8Array.from({ length: 18 }, (_, i) => i)).toString('base64'), rssi: -60 },
  { payloadBase64: Buffer.from(Uint8Array.from({ length: 18 }, (_, i) => 17 - i)).toString('base64'), rssi: -72 },
];

