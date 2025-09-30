import nacl from 'tweetnacl';

export type KeyPair = { publicKey: Uint8Array; secretKey: Uint8Array };

export function generateEphemeralKeyPair(): KeyPair {
  return nacl.box.keyPair();
}

export function deriveSharedSecret(peerPublicKey: Uint8Array, mySecretKey: Uint8Array): Uint8Array {
  return nacl.scalarMult(mySecretKey, peerPublicKey);
}

export function encryptMessage(key: Uint8Array, plaintext: Uint8Array): { nonce: Uint8Array; box: Uint8Array } {
  const nonce = new Uint8Array(nacl.box.nonceLength);
  // RN polyfill for crypto.getRandomValues is provided by react-native-get-random-values
  crypto.getRandomValues(nonce);
  const box = nacl.secretbox(plaintext, nonce, key);
  return { nonce, box };
}

export function decryptMessage(key: Uint8Array, nonce: Uint8Array, box: Uint8Array): Uint8Array | null {
  return nacl.secretbox.open(box, nonce, key);
}

