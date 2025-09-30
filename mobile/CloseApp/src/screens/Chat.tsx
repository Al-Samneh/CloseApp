import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RelayClient } from '../network/ws';
import nacl from 'tweetnacl';
import { sha256 } from '@noble/hashes/sha256';

type Params = { Chat: { sessionId: string } };

export default function Chat() {
  const route = useRoute<RouteProp<Params, 'Chat'>>();
  const sessionId = route.params?.sessionId ?? 'unknown';
  const clientRef = useRef<RelayClient>();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ id: string; from: 'me' | 'peer'; text: string }[]>([]);
  const [keyPair] = useState(() => nacl.box.keyPair());
  const [sessionKey, setSessionKey] = useState<Uint8Array | null>(null);

  useEffect(() => {
    const client = new RelayClient('ws://192.168.1.86:8080/ws/' + sessionId);
    client.connect(raw => {
      try {
        const ev = JSON.parse(raw as any);
        if (ev.type === 'pubkey') {
          const peerPub = Uint8Array.from(Buffer.from(ev.key, 'base64'));
          const shared = nacl.scalarMult(keyPair.secretKey, peerPub);
          const key = Uint8Array.from(sha256(shared).slice(0, 32));
          setSessionKey(key);
        } else if (ev.type === 'msg') {
          if (!sessionKey) return;
          const nonce = Uint8Array.from(Buffer.from(ev.nonce, 'base64'));
          const box = Uint8Array.from(Buffer.from(ev.box, 'base64'));
          const plain = nacl.secretbox.open(box, nonce, sessionKey);
          if (!plain) return;
          setMessages(prev => [...prev, { id: String(Math.random()), from: 'peer', text: Buffer.from(plain).toString('utf8') }]);
        }
      } catch {}
    });
    clientRef.current = client;
    // announce our pubkey
    const keyB64 = Buffer.from(keyPair.publicKey).toString('base64');
    // slight delay to ensure ws open
    setTimeout(() => client.send({ session_id: sessionId, ciphertext: JSON.stringify({ type: 'pubkey', key: keyB64 }), nonce: '', ts: Date.now() }), 200);
    return () => client.close();
  }, [sessionId]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    if (!sessionKey) {
      Alert.alert('Establishing secure session. Please wait a moment.');
      return;
    }
    const nonce = new Uint8Array(nacl.box.nonceLength);
    crypto.getRandomValues(nonce);
    const box = nacl.secretbox(Uint8Array.from(Buffer.from(text, 'utf8')), nonce, sessionKey);
    const payload = { type: 'msg', nonce: Buffer.from(nonce).toString('base64'), box: Buffer.from(box).toString('base64') };
    clientRef.current?.send({ session_id: sessionId, ciphertext: JSON.stringify(payload), nonce: '', ts: Date.now() });
    setMessages(prev => [...prev, { id: String(Math.random()), from: 'me', text }]);
    setInput('');
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={x => x.id}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.from === 'me' ? styles.me : styles.peer]}>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.composer}>
        <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Message" placeholderTextColor="#666" />
        <Button title="Send" onPress={send} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e0e0e' },
  bubble: { padding: 10, margin: 8, borderRadius: 12, maxWidth: '80%' },
  me: { backgroundColor: '#2a2a2a', alignSelf: 'flex-end' },
  peer: { backgroundColor: '#1a1a1a', alignSelf: 'flex-start' },
  text: { color: '#fff' },
  composer: { flexDirection: 'row', gap: 8, padding: 8, borderTopColor: '#222', borderTopWidth: 1 },
  input: { flex: 1, backgroundColor: '#1a1a1a', color: '#fff', paddingHorizontal: 12, borderRadius: 8 },
});

