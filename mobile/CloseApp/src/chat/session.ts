import nacl from 'tweetnacl';
import { generateEphemeralKeyPair } from '../crypto/ephemeral';

export type EphemeralChatKeys = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

export function createEphemeralKeys(): EphemeralChatKeys {
  return generateEphemeralKeyPair();
}

export type ChatMessage = { id: string; from: 'me' | 'peer'; text: string; ts: number };

export class ChatSessionState {
  sessionId: string;
  messages: ChatMessage[] = [];
  expiresAt: number;
  constructor(sessionId: string, ttlMs: number) {
    this.sessionId = sessionId;
    this.expiresAt = Date.now() + ttlMs;
  }
}

