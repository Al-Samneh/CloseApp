import 'react-native-get-random-values';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const client = new RelayClient('ws://192.168.1.216:8080/ws/' + sessionId);
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
      Alert.alert(
        'No Connection', 
        'Waiting for the other person to join this chat.\n\nSession ID: ' + sessionId + '\n\nThey need to also click "Send Link" to connect.',
        [{ text: 'OK' }]
      );
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        {/* Close branding header */}
        <View style={styles.chatHeader}>
          <View>
            <Text style={styles.brandText}>Close</Text>
            <Text style={styles.sessionId}>Session: {sessionId.slice(0, 8)}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, sessionKey ? styles.statusConnected : styles.statusWaiting]} />
            <Text style={styles.statusText}>{sessionKey ? 'Connected' : 'Waiting...'}</Text>
          </View>
        </View>

        <FlatList
          data={messages}
          keyExtractor={x => x.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            paddingTop: 12,
            paddingHorizontal: 16,
            paddingBottom: 8 + insets.bottom + 60,
          }}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.from === 'me' ? styles.me : styles.peer]}>
              <Text style={styles.text}>{item.text}</Text>
            </View>
          )}
        />
        <View style={[styles.composer, { paddingBottom: 12 + insets.bottom }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message"
            placeholderTextColor="#666"
          />
          <TouchableOpacity style={styles.sendButton} onPress={send}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0a0a' },
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#0f0f0f',
  },
  brandText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sessionId: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'Courier',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusConnected: {
    backgroundColor: '#34c759',
  },
  statusWaiting: {
    backgroundColor: '#ff9500',
  },
  statusText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '500',
  },
  bubble: { 
    padding: 12, 
    margin: 6, 
    borderRadius: 16, 
    maxWidth: '75%',
  },
  me: { 
    backgroundColor: '#0066ff', 
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  peer: { 
    backgroundColor: '#1a1a1a', 
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  text: { color: '#fff', fontSize: 16, lineHeight: 20 },
  composer: { 
    flexDirection: 'row', 
    gap: 10, 
    paddingHorizontal: 16, 
    paddingTop: 12, 
    borderTopColor: '#1a1a1a', 
    borderTopWidth: 1, 
    backgroundColor: '#0f0f0f',
  },
  input: { 
    flex: 1, 
    backgroundColor: '#1a1a1a', 
    color: '#fff', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 20,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#0066ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

