export type Sex = 'male' | 'female' | 'other';

export type Preference = { gender: Sex[]; age_min: number; age_max: number };

export type UserProfile = {
  id_local: string;
  name: string;
  age: number;
  sex: Sex;
  preference: Preference;
  interests: string[];
  bio?: string;
  socials_encrypted?: string;
  device_secret_hash: string;
};

export type Candidate = {
  ephemeralIdHex: string;
  fingerprintHex: string;
  rssi: number;
  ts: number;
};

export type MatchSession = {
  session_id: string;
  ephemeral_a_hash: string;
  ephemeral_b_hash: string;
  start_ts: number;
  expiry_ts: number;
  mutual_consent: { a: boolean; b: boolean };
};

