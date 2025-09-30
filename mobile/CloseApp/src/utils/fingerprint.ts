import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';

export type InterestFingerprint = {
  bloom64: bigint; // 64-bit bloom as bigint
  obfuscated: Uint8Array; // 8-byte obfuscated hash
};

// Minimal deterministic tag dictionary; in production load from constants
const DEFAULT_TAGS = [
  'music',
  'books',
  'sports',
  'art',
  'tech',
  'travel',
  'food',
  'movies',
  'fitness',
  'gaming',
];

export function tagToId(tag: string, allTags: string[] = DEFAULT_TAGS): number {
  const idx = allTags.indexOf(tag.toLowerCase());
  return idx >= 0 ? idx : (Number(sha256(Uint8Array.from(Buffer.from(tag)))) % 1000);
}

function setBit64(n: bigint, pos: number): bigint {
  return n | (1n << BigInt(pos));
}

export function buildBloom64FromTags(tags: string[], k = 3, universeTags: string[] = DEFAULT_TAGS): bigint {
  let bloom = 0n;
  for (const tag of tags) {
    const id = tagToId(tag, universeTags);
    // derive k positions using sha256(id||j)
    for (let j = 0; j < k; j++) {
      const input = new Uint8Array([id & 0xff, (id >> 8) & 0xff, j & 0xff]);
      const hash = sha256(input);
      const pos = hash[0] % 64; // simple mapping
      bloom = setBit64(bloom, pos);
    }
  }
  return bloom;
}

export function bigintTo8Bytes(n: bigint): Uint8Array {
  const out = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

export function approximateJaccardFromBlooms(a: bigint, b: bigint): number {
  const intersection = bitCount64(a & b);
  const union = bitCount64(a | b);
  return union === 0 ? 0 : intersection / union;
}

export function bitCount64(n: bigint): number {
  let count = 0;
  while (n) {
    n &= n - 1n; // clear lowest set bit
    count++;
  }
  return count;
}

export function buildInterestFingerprint(tags: string[], deviceSecret: Uint8Array): InterestFingerprint {
  const bloom64 = buildBloom64FromTags(tags);
  const bloomBytes = bigintTo8Bytes(bloom64);
  const mac = hmac(sha256, deviceSecret, bloomBytes);
  const obfuscated = Uint8Array.from(mac.slice(0, 8));
  return { bloom64, obfuscated };
}

