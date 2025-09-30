import 'react-native-get-random-values';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Linking, PanResponder } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { RelayClient, type RelayMessage } from '../network/ws';
import { loadProfile } from '../storage/profile';
import nacl from 'tweetnacl';
import { sha256 } from '@noble/hashes/sha256';

type Params = { Chat: { sessionId: string } };

export default function Chat() {
  const route = useRoute<RouteProp<Params, 'Chat'>>();
  const nav = useNavigation<any>();
  const sessionId = route.params?.sessionId ?? 'unknown';
  const clientRef = useRef<RelayClient>();
  const sessionKeyRef = useRef<Uint8Array | null>(null);
  const myWantsToCloseRef = useRef(false);
  const peerWantsToCloseRef = useRef(false);
  const peerNameRef = useRef<string | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ id: string; from: 'me' | 'peer'; text: string }[]>([]);
  const [keyPair] = useState(() => nacl.box.keyPair());
  const [sessionKey, setSessionKey] = useState<Uint8Array | null>(null);
  const [myName, setMyName] = useState<string>('');
  const [peerName, setPeerName] = useState<string | null>(null);
  const [myInstagram, setMyInstagram] = useState<string | null>(null);
  const [peerInstagram, setPeerInstagram] = useState<string | null>(null);
  const [showInstagram, setShowInstagram] = useState(false);
  const [myWantsToClose, setMyWantsToClose] = useState(false);
  const [peerWantsToClose, setPeerWantsToClose] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const insets = useSafeAreaInsets();

  // Swipe down gesture to trigger "Come Closer"
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to swipe down gestures
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        // Swipe down detected (dy > 50 pixels)
        if (gestureState.dy > 50 && sessionKey) {
          handleCloseRequest();
        }
      },
    })
  ).current;

  // When social is revealed, keep the chat open; user can tap the handle to open Instagram

  const openInstagramProfile = async (handle: string) => {
    try {
      const username = handle.replace('@', '').trim();
      const appUrl = `instagram://user?username=${username}`;
      const webUrl = `https://instagram.com/${username}`;
      const supported = await Linking.canOpenURL(appUrl);
      if (supported) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (e) {
      const username = handle.replace('@', '').trim();
      const fallbackUrl = `https://instagram.com/${username}`;
      Linking.openURL(fallbackUrl);
    }
  };

  useEffect(() => {
    
    
    const { WS_BASE } = require('../config');
    const client = new RelayClient(`${WS_BASE}/ws/${sessionId}`);
    
    // Load profile and prepare public key message
    const sendPublicKey = async () => {
      const profile = await loadProfile();
      if (profile) {
        setMyName(profile.name);
        if (profile.socials_encrypted) {
          setMyInstagram(profile.socials_encrypted);
        }
      }
      
      const keyB64 = Buffer.from(keyPair.publicKey).toString('base64');
      const payload: any = { type: 'pubkey', key: keyB64 };
      
      if (profile?.name) {
        payload.name = profile.name;
      }
      if (profile?.socials_encrypted) {
        payload.instagram = profile.socials_encrypted;
      }
      
      
      client.send({ session_id: sessionId, ciphertext: JSON.stringify(payload), nonce: '', ts: Date.now() });
    };
    
    client.connect(relayMsg => {
      try {
        // Parse the ciphertext field to get the actual message
        const ev = JSON.parse(relayMsg.ciphertext);
        
        if (ev.type === 'pubkey') {
          
          
          // Check if this is our FIRST time receiving a peer's public key
          const isFirstHandshake = !sessionKeyRef.current;
          
          const peerPub = Uint8Array.from(Buffer.from(ev.key, 'base64'));
          const shared = nacl.scalarMult(keyPair.secretKey, peerPub);
          const key = Uint8Array.from(sha256(shared).slice(0, 32));
          sessionKeyRef.current = key; // Store in ref for WebSocket handler
          setSessionKey(key);
          
          // Extract peer's name and Instagram
          if (ev.name) {
            peerNameRef.current = ev.name;
            setPeerName(ev.name);
            
          }
          if (ev.instagram) {
            setPeerInstagram(ev.instagram);
            
          }
          
          
          
          // IMPORTANT: Respond with our public key so they can establish their session too
          // Only do this if this was our first handshake (prevents infinite loop)
          if (isFirstHandshake) {
            
            loadProfile().then(profile => {
              const keyB64 = Buffer.from(keyPair.publicKey).toString('base64');
              const payload: any = { type: 'pubkey', key: keyB64 };
              
              if (profile?.name) {
                payload.name = profile.name;
              }
              if (profile?.socials_encrypted) {
                payload.instagram = profile.socials_encrypted;
              }
              
              clientRef.current?.send({ 
                session_id: sessionId, 
                ciphertext: JSON.stringify(payload), 
                nonce: '', 
                ts: Date.now() 
              });
            });
          } else {
            
          }
        } else if (ev.type === 'msg') {
          const currentKey = sessionKeyRef.current;
          if (!currentKey) {
            
            return;
          }
          const nonce = Uint8Array.from(Buffer.from(ev.nonce, 'base64'));
          const box = Uint8Array.from(Buffer.from(ev.box, 'base64'));
          const plain = nacl.secretbox.open(box, nonce, currentKey);
          if (!plain) {
            
            return;
          }
          setMessages(prev => [...prev, { id: String(Math.random()), from: 'peer', text: Buffer.from(plain).toString('utf8') }]);
        } else if (ev.type === 'close_request') {
          // Peer wants to "Come Closer"
          peerWantsToCloseRef.current = true;
          setPeerWantsToClose(true);
          if (myWantsToCloseRef.current) {
            // Both want to close - reveal Instagram and keep chat open
            setShowInstagram(true);
          } else {
            // Ask this user if they want to come closer
            Alert.alert(
              '💫 Come Closer?',
              `${peerNameRef.current || 'They'} wants to come closer and exchange social media. Do you want to?`,
              [
                { 
                  text: 'No', 
                  style: 'cancel',
                  onPress: () => {
                    // Send rejection
                    clientRef.current?.send({ 
                      session_id: sessionId, 
                      ciphertext: JSON.stringify({ type: 'close_reject' }), 
                      nonce: '', 
                      ts: Date.now() 
                    });
                    Alert.alert('Disconnected', 'You chose not to come closer. Chat ended.', [
                      { text: 'OK', onPress: () => nav.goBack() }
                    ]);
                  }
                },
                { 
                  text: 'Yes!', 
                  onPress: () => {
                    myWantsToCloseRef.current = true;
                    setMyWantsToClose(true);
                    setShowInstagram(true);
                    clientRef.current?.send({ 
                      session_id: sessionId, 
                      ciphertext: JSON.stringify({ type: 'close_accept' }), 
                      nonce: '', 
                      ts: Date.now() 
                    });
                    // Stay in chat; user can tap Instagram handle
                  }
                },
              ]
            );
          }
        } else if (ev.type === 'close_accept') {
          // Peer accepted our request
          setShowInstagram(true);
        } else if (ev.type === 'close_reject') {
          // Peer rejected
          Alert.alert('Disconnected', 'They chose not to come closer. Chat ended.', [
            { text: 'OK', onPress: () => nav.goBack() }
          ]);
        }
      } catch (err) {
        
      }
    }, () => {
      // WebSocket connected callback
      
      setWsConnected(true);
    });
    clientRef.current = client;
    
    // Send public key immediately (will queue if WebSocket not open)
    sendPublicKey().catch(() => {});
    
    return () => {
      
      client.close();
    };
  }, [sessionId]); // Only re-run if sessionId changes

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const currentKey = sessionKeyRef.current;
    if (!currentKey) {
      const statusMsg = wsConnected 
        ? 'WebSocket connected, but waiting for peer\'s public key...\n\nSession ID: ' + sessionId 
        : 'Connecting to chat server...\n\nSession ID: ' + sessionId;
      Alert.alert(
        'No Session Key', 
        statusMsg + '\n\nThey need to also accept the link request to connect.',
        [{ text: 'OK' }]
      );
      return;
    }
    const nonce = new Uint8Array(nacl.box.nonceLength);
    crypto.getRandomValues(nonce);
    const box = nacl.secretbox(Uint8Array.from(Buffer.from(text, 'utf8')), nonce, currentKey);
    const payload = { type: 'msg', nonce: Buffer.from(nonce).toString('base64'), box: Buffer.from(box).toString('base64') };
    clientRef.current?.send({ session_id: sessionId, ciphertext: JSON.stringify(payload), nonce: '', ts: Date.now() });
    setMessages(prev => [...prev, { id: String(Math.random()), from: 'me', text }]);
    setInput('');
  };

  const handleCloseRequest = () => {
    if (myWantsToCloseRef.current) {
      Alert.alert('Already Requested', 'You already want to come closer. Waiting for them...');
      return;
    }
    
    Alert.alert(
      '💫 Come Closer?',
      'Request to exchange social media with this person?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            myWantsToCloseRef.current = true;
            setMyWantsToClose(true);
            clientRef.current?.send({ 
              session_id: sessionId, 
              ciphertext: JSON.stringify({ type: 'close_request' }), 
              nonce: '', 
              ts: Date.now() 
            });
            
            if (peerWantsToCloseRef.current) {
              // They already want to close too!
              setShowInstagram(true);
              Alert.alert('💫 Coming Closer!', 'You both agreed! Social media revealed.', [
                { text: 'OK', onPress: () => {
                  setTimeout(() => nav.goBack(), 500); // Brief delay to see the Instagram
                }}
              ]);
            } else {
              Alert.alert('Request Sent', 'Waiting for them to respond...');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Close branding header - swipe down to trigger "Come Closer" */}
        <View style={styles.chatHeader} {...panResponder.panHandlers}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandText}>Close</Text>
            {peerName ? (
              <Text style={styles.peerName}>Chatting with {peerName}</Text>
            ) : (
              <Text style={styles.sessionId}>Session: {sessionId.slice(0, 8)}</Text>
            )}
            {showInstagram && peerInstagram && (
              <TouchableOpacity onPress={() => openInstagramProfile(peerInstagram)}>
                <Text style={styles.instagramText}>📸 {peerInstagram}</Text>
              </TouchableOpacity>
            )}
          </View>
          {sessionKey ? (
            <TouchableOpacity style={styles.closeButton} onPress={handleCloseRequest}>
              <Text style={styles.closeButtonText}>💫 Close</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.statusContainer}>
              <View style={styles.statusWaiting} />
              <Text style={styles.statusText}>Waiting...</Text>
            </View>
          )}
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
            paddingBottom: 100,
          }}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.from === 'me' ? styles.me : styles.peer]}>
              <Text style={styles.text}>{item.text}</Text>
            </View>
          )}
        />
        <View style={[styles.composer]}>
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
  peerName: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 2,
  },
  instagramText: {
    color: '#0066ff',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#0066ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    paddingBottom: 12, 
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

