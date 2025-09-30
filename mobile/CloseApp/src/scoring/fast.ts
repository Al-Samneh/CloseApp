export type Preference = { gender: string[]; age_min?: number; age_max?: number };

export type RawProfile = {
  age: number;
  sex: 'male' | 'female' | 'other';
  preferences: Preference;
  interests: string[];
  bio?: string;
};

export type ProximityInput = { rssi: number };

export type ScoreWeights = {
  w_age: number;
  w_gender: number;
  w_interest: number;
  w_bio: number;
  w_proximity: number;
};

export const DEFAULT_WEIGHTS: ScoreWeights = {
  w_age: 0.25,
  w_gender: 0.15,
  w_interest: 0.4,
  w_bio: 0.05,
  w_proximity: 0.15,
};

export type BitMask64 = { hi: number; lo: number };

function emptyMask(): BitMask64 { return { hi: 0, lo: 0 }; }

function hashToken(t: string): number {
  let h = 2166136261 >>> 0; // FNV-1a 32-bit
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function addToMask(mask: BitMask64, token: string) {
  const h = hashToken(token);
  const idx = h & 63; // 0..63
  if (idx < 32) {
    mask.lo |= (1 << idx) >>> 0;
  } else {
    mask.hi |= (1 << (idx - 32)) >>> 0;
  }
}

function normalizeTokens(textOrList: string | string[]): string[] {
  const src = Array.isArray(textOrList) ? textOrList.join(' ') : textOrList;
  return src
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3);
}

export function buildMaskFromTokens(tokens: string[]): BitMask64 {
  const mask = emptyMask();
  for (const t of tokens) addToMask(mask, t);
  return mask;
}

function andMask(a: BitMask64, b: BitMask64): BitMask64 { return { hi: a.hi & b.hi, lo: a.lo & b.lo }; }
function orMask(a: BitMask64, b: BitMask64): BitMask64 { return { hi: a.hi | b.hi, lo: a.lo | b.lo }; }

function popcount32(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
}
function popcount64(m: BitMask64): number { return popcount32(m.hi) + popcount32(m.lo); }

function jaccardMask(a: BitMask64, b: BitMask64): number {
  const inter = andMask(a, b);
  const uni = orMask(a, b);
  const pcInter = popcount64(inter);
  const pcUnion = popcount64(uni);
  return pcUnion === 0 ? 0 : pcInter / pcUnion;
}

export function normalizeRssiToProximityScore(rssi: number): number {
  const max = -45, min = -85;
  if (rssi >= max) return 1;
  if (rssi <= min) return 0;
  return (rssi - min) / (max - min);
}

export type CompiledProfile = {
  raw: RawProfile;
  interestMask: BitMask64;
  bioMask: BitMask64;
};

export function compileProfile(p: RawProfile): CompiledProfile {
  const interests = normalizeTokens(p.interests);
  const bioTokens = p.bio ? normalizeTokens(p.bio) : [];
  return {
    raw: p,
    interestMask: buildMaskFromTokens(interests),
    bioMask: buildMaskFromTokens(bioTokens),
  };
}

export function fastCompatibilityScore(
  me: CompiledProfile,
  peer: CompiledProfile,
  prox: ProximityInput,
  w: ScoreWeights = DEFAULT_WEIGHTS
): number {
  const genderAllowed = me.raw.preferences.gender.length ? me.raw.preferences.gender.includes(peer.raw.sex) : true;
  // Age closeness: perfect when equal, linearly down to 0 at 10-year gap
  const ageDiff = Math.abs(me.raw.age - peer.raw.age);
  const a = Math.max(0, 1 - ageDiff / 10);

  const p = normalizeRssiToProximityScore(prox.rssi);
  if (p < 0.05) return 0;

  // Interest similarity with smoothing: avoid exact-zero when any token overlaps but hashes collide away
  let i = jaccardMask(me.interestMask, peer.interestMask);
  if (i === 0) {
    // Fallback: count token overlap in a tiny set to mitigate rare hash corner cases
    // Build minimal sets from at most 16 tokens each (bounded for speed)
    const meTokens = new Set((Array.isArray(me.raw.interests) ? me.raw.interests : []).slice(0, 16).map(t => t.toLowerCase()));
    const peerTokens = new Set((Array.isArray(peer.raw.interests) ? peer.raw.interests : []).slice(0, 16).map(t => t.toLowerCase()));
    let inter = 0;
    for (const t of meTokens) if (peerTokens.has(t)) inter++;
    const uni = new Set([...meTokens, ...peerTokens]).size;
    if (uni > 0 && inter > 0) i = inter / uni * 0.6; // dampened contribution
  }
  const b = jaccardMask(me.bioMask, peer.bioMask);

  // Soft gender factor: 1 if allowed, 0 if not
  const g = genderAllowed ? 1 : 0;
  return w.w_age * a + w.w_gender * g + w.w_interest * i + w.w_bio * b + w.w_proximity * p;
}


