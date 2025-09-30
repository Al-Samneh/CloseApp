import EncryptedStorage from 'react-native-encrypted-storage';
import { sha256 } from '@noble/hashes/sha256';
import { UserProfile } from '../types';

const KEY = 'close_profile_v1';

export async function loadProfile(): Promise<UserProfile | null> {
  const s = await EncryptedStorage.getItem(KEY);
  return s ? (JSON.parse(s) as UserProfile) : null;
}

export async function saveProfile(p: UserProfile): Promise<void> {
  await EncryptedStorage.setItem(KEY, JSON.stringify(p));
}

export function hashDeviceSecret(secret: Uint8Array): string {
  const h = sha256(secret);
  return Buffer.from(h).toString('hex');
}

export function createEmptyProfile(): UserProfile {
  return {
    id_local: (global as any).crypto?.randomUUID?.() ?? String(Math.random()),
    name: '',
    age: 18,
    sex: 'other',
    preference: { gender: ['male','female','other'], age_min: 18, age_max: 99 },
    interests: [],
    bio: '',
    socials_encrypted: undefined,
    device_secret_hash: '',
  };
}

