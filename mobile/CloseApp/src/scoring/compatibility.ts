type Preference = { gender: string[]; age_min: number; age_max: number };

export type Profile = {
  age: number;
  sex: 'male' | 'female' | 'other';
  preferences: Preference;
  interests: string[];
};

export type ProximityInput = { rssi: number };

export type ScoreWeights = {
  w_age: number;
  w_gender: number;
  w_interest: number;
  w_proximity: number;
};

export const DEFAULT_WEIGHTS: ScoreWeights = {
  w_age: 0.2,
  w_gender: 0.2,
  w_interest: 0.45,
  w_proximity: 0.15,
};

export function normalizeRssiToProximityScore(rssi: number): number {
  // Clamp: -45 dBm (close) -> 1.0; -85 dBm (far) -> 0.0
  const max = -45;
  const min = -85;
  if (rssi >= max) return 1;
  if (rssi <= min) return 0;
  return (rssi - min) / (max - min);
}

export function ageScore(peerAge: number, myPref: Preference): number {
  if (peerAge >= myPref.age_min && peerAge <= myPref.age_max) return 1;
  const dist = peerAge < myPref.age_min ? myPref.age_min - peerAge : peerAge - myPref.age_max;
  return Math.max(0, 1 - dist / 10);
}

export function genderScore(peerSex: Profile['sex'], myPref: Preference): number {
  return myPref.gender.includes(peerSex) ? 1 : 0;
}

export function jaccard(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x))).size;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function compatibilityScore(my: Profile, peer: Profile, prox: ProximityInput, weights: ScoreWeights = DEFAULT_WEIGHTS): number {
  const a = ageScore(peer.age, my.preferences);
  const g = genderScore(peer.sex, my.preferences);
  const i = jaccard(new Set(my.interests), new Set(peer.interests));
  const p = normalizeRssiToProximityScore(prox.rssi);
  return weights.w_age * a + weights.w_gender * g + weights.w_interest * i + weights.w_proximity * p;
}

