import 'react-native-get-random-values';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadProfile } from '../storage/profile';
import { BleOrchestrator } from '../ble/orchestrator';
import { useNavigation } from '@react-navigation/native';
import { checkCompatibilityWithAI } from '../matching/ai';
import type { Profile } from '../scoring/compatibility';
import { compileProfile, fastCompatibilityScore, type CompiledProfile } from '../scoring/fast';
import { LinkRequestManager, type LinkRequest } from '../network/linkRequests';

type DeviceItem = { 
  id: string; 
  rssi: number;
  compatibilityScore?: number;
  compatibilityExplanation?: string;
  isChecking?: boolean;
  pendingSessionId?: string;
  lastSeen: number; // timestamp of last update
};

export default function Home() {
  const nav = useNavigation<any>();
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<DeviceItem[]>([]);
  const [ble, setBle] = useState<BleOrchestrator | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [myBio, setMyBio] = useState<string>('');
  const [myCompiledProfile, setMyCompiledProfile] = useState<CompiledProfile | null>(null);
  const [myEphemeralId, setMyEphemeralId] = useState<string>('');
  const [incomingRequest, setIncomingRequest] = useState<LinkRequest | null>(null);
  const linkRequestManager = useRef<LinkRequestManager>(new LinkRequestManager());
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const p = await loadProfile();
      if (!p) {
        nav.reset({ index: 0, routes: [{ name: 'Onboarding' as never }] });
      } else {
        // Convert UserProfile to compatibility Profile format
        const compatProfile: Profile = {
          age: p.age,
          sex: p.sex,
          preferences: p.preference, // Note: UserProfile uses 'preference', compatibility uses 'preferences'
          interests: p.interests,
        };
        setMyProfile(compatProfile);
        const bio = p.bio || '';
        setMyBio(bio);
        setMyCompiledProfile(compileProfile({ ...compatProfile, bio }));
      }
    })();
    return () => {
      ble?.stop();
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, []);

  const toggle = async () => {
    try {
      const p = await loadProfile();
      if (!p) return;
      if (scanning) {
        ble?.stop();
        linkRequestManager.current.disconnect(); // Disconnect from link requests
        
        // Clear cleanup timer
        if (cleanupTimerRef.current) {
          clearInterval(cleanupTimerRef.current);
          cleanupTimerRef.current = null;
        }
        
        setScanning(false);
        setErrorMsg('');
        // Don't clear items - keep them for reference
        setMyEphemeralId(''); // Clear our ID
        return;
      }
      setErrorMsg('');
      const deviceSecret = new Uint8Array(32);
      crypto.getRandomValues(deviceSecret);
      
      // Start BLE first - it will generate our ephemeral ID
      const orch = new BleOrchestrator(deviceSecret);
      setBle(orch);
      orch.start({ age: p.age, sex: p.sex as any, preferences: { gender: p.preference.gender as any, age_min: p.preference.age_min, age_max: p.preference.age_max }, interests: p.interests }, disc => {
        const id = Buffer.from(disc.payload.slice(1, 9)).toString('hex').slice(0, 12);
        const now = Date.now();
        
        setItems(prev => {
          const existing = prev.find(x => x.id === id);
          if (existing) {
            // Update RSSI and lastSeen, keep all other data (compatibility, etc.)
            return prev.map(x => x.id === id ? { ...x, rssi: disc.rssi, lastSeen: now } : x);
          } else {
            // New device - add to top of list
            return [{ id, rssi: disc.rssi, lastSeen: now }, ...prev].slice(0, 50);
          }
        });
      });
      
      // Wait a moment for BLE to generate the ephemeral ID, then connect to link requests
      setTimeout(() => {
        const myId = orch.myEphemeralId;
        setMyEphemeralId(myId);
        
        linkRequestManager.current.connect(
          myId, 
          (request) => {
            setIncomingRequest(request);
            // Show notification alert
            Alert.alert(
              '🔗 Link Request!',
              `Someone wants to connect with you!`,
              [
                { text: 'Reject', style: 'cancel', onPress: () => setIncomingRequest(null) },
                { text: 'Accept', onPress: () => handleAcceptRequest(request) },
              ]
            );
          }
        );
      }, 100);
      
      // Start cleanup timer - remove devices not seen in 3 seconds
      cleanupTimerRef.current = setInterval(() => {
        const now = Date.now();
        setItems(prev => prev.filter(item => now - item.lastSeen < 3000));
      }, 1000);
      
      setScanning(true);
    } catch (err: any) {
      
      const msg = err?.message || 'BLE Error: Make sure Bluetooth is enabled and permissions are granted';
      setErrorMsg(msg);
      Alert.alert('Bluetooth Error', msg + '\n\nTry:\n1. Enable Bluetooth in Settings\n2. Restart the app\n3. Check app permissions in Settings > Close');
      setScanning(false);
    }
  };

  const checkCompatibility = async (id: string) => {
    if (!myProfile) {
      Alert.alert('Error', 'Your profile is not loaded');
      return;
    }

    // Set checking state
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isChecking: true } : item
    ));

    try {
      // In production, fetch the peer's profile from your backend or local cache
      // For now, create a mock peer profile for demonstration
      const mockPeerProfile: Profile = {
        age: 25,
        sex: 'female',
        preferences: { gender: ['male'], age_min: 23, age_max: 30 },
        interests: ['music', 'hiking', 'books'],
      };

      // AGE SAFETY CHECK
      const ageDiff = Math.abs(myProfile.age - mockPeerProfile.age);
      const myIsAdult = myProfile.age >= 18;
      const peerIsAdult = mockPeerProfile.age >= 18;
      
      // Block if one is under 18 and other is adult, unless difference is ≤2 years
      if (myIsAdult !== peerIsAdult && ageDiff > 2) {
        setItems(prev => prev.map(item =>
          item.id === id ? {
            ...item,
            isChecking: false,
            compatibilityScore: 0,
            compatibilityExplanation: 'Age incompatible',
          } : item
        ));
        Alert.alert('❌ Incompatible', 'Age difference too large for safety.');
        return;
      }

      // Fast path: precompiled masks and bitwise Jaccard
      if (!myCompiledProfile) {
        throw new Error('Profile not compiled');
      }
      const peerCompiled = compileProfile({ ...mockPeerProfile, bio: '' });
      const fastScore01 = fastCompatibilityScore(myCompiledProfile, peerCompiled, { rssi: items.find(it => it.id === id)?.rssi ?? -65 });
      const totalScore = Math.round(fastScore01 * 100);
      
      const shouldMatch = totalScore >= 35;

      // Build explanation
      const reasons = [];
      if (totalScore >= 70) reasons.push('high shared interests');
      if (ageDiff <= 2) reasons.push('close in age');
      const explanation = reasons.length > 0 ? reasons.join(', ') : 'Low compatibility';

      // Update item with compatibility result
      setItems(prev => prev.map(item =>
        item.id === id ? {
          ...item,
          isChecking: false,
          compatibilityScore: totalScore,
          compatibilityExplanation: explanation,
        } : item
      ));

      // Show result to user
      if (shouldMatch) {
        Alert.alert(
          '✅ Great Match!',
          `Compatibility: ${totalScore}%\n\n${explanation.charAt(0).toUpperCase() + explanation.slice(1)}!\n\nYou can now send a link request!`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '❌ Low Compatibility',
          `Compatibility: ${totalScore}%\n\nNot enough in common.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, isChecking: false } : item
      ));
      Alert.alert('Error', 'Failed to check compatibility. Please try again.');
    }
  };

  const sendLinkRequest = (id: string) => {
    Alert.alert(
      'Send Link Request?',
      'This will notify the other person that you want to connect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: () => {
            try {
              // Generate a unique session ID for this chat
              const uniqueSessionId = `${myEphemeralId}-${id}-${Date.now()}`;
              
              linkRequestManager.current.sendLinkRequest(id, uniqueSessionId);
              
              // Save this session ID so we can join when they accept
              setItems(prev => prev.map(item => 
                item.id === id ? { ...item, pendingSessionId: uniqueSessionId } : item
              ));
              
              // Stop scanning before navigating to chat
              if (scanning && ble) {
                ble.stop();
                linkRequestManager.current.disconnect();
                if (cleanupTimerRef.current) {
                  clearInterval(cleanupTimerRef.current);
                  cleanupTimerRef.current = null;
                }
                setScanning(false);
                
              }
              
              // Navigate to chat immediately
              
              nav.navigate('Chat' as never, { sessionId: uniqueSessionId } as never);
            } catch (error) {
              
              Alert.alert('Error', 'Failed to send link request. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAcceptRequest = (request: LinkRequest) => {
    setIncomingRequest(null);
    
    
    
    // Stop scanning before navigating to chat
    if (scanning && ble) {
      ble.stop();
      linkRequestManager.current.disconnect();
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }
      setScanning(false);
      
    }
    
    // Navigate to chat with the session ID from the request
    // Use setTimeout to ensure UI updates complete before navigation
    
    setTimeout(() => {
      
      nav.navigate('Chat' as never, { sessionId: request.from_session_id } as never);
    }, 100); // Small delay to ensure clean state transition
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Close branding header */}
        <View style={styles.brandHeader}>
          <Text style={styles.brandText}>Close</Text>
        </View>

        <View style={[styles.header, { paddingHorizontal: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Nearby</Text>
            <Text style={styles.subtitle}>{scanning ? 'Scanning for devices...' : 'Scan to discover nearby peers'}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.scanButton, scanning && styles.scanButtonActive]} 
            onPress={toggle}
          >
            <Text style={styles.scanButtonText}>{scanning ? 'Stop' : 'Start'}</Text>
          </TouchableOpacity>
        </View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.metaBar}>
          <Text style={styles.metaText}>Found: {items.length}</Text>
        </View>

        <FlatList
          data={items}
          keyExtractor={x => x.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.id}>{item.id}</Text>
                <Text style={styles.rowSub}>Signal {item.rssi} dBm</Text>
                {item.compatibilityScore !== undefined && (
                  <Text style={[styles.compatScore, item.compatibilityScore >= 35 ? styles.compatGood : styles.compatBad]}>
                    {item.compatibilityScore}% Match
                  </Text>
                )}
              </View>
              <View style={styles.signalBarContainer}>
                <View style={[styles.signalBar, { width: Math.max(6, Math.min(60, 100 + item.rssi)), opacity: 0.9 }]} />
              </View>
              
              {item.isChecking ? (
                <View style={styles.checkingContainer}>
                  <ActivityIndicator size="small" color="#0066ff" />
                  <Text style={styles.checkingText}>Checking...</Text>
                </View>
              ) : item.compatibilityScore === undefined ? (
                <TouchableOpacity style={styles.checkButton} onPress={() => checkCompatibility(item.id)}>
                  <Text style={styles.checkButtonText}>Check Match</Text>
                </TouchableOpacity>
              ) : item.compatibilityScore >= 35 ? (
                <TouchableOpacity style={styles.linkButton} onPress={() => sendLinkRequest(item.id)}>
                  <Text style={styles.linkButtonText}>Send Link</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.noMatchContainer}>
                  <Text style={styles.noMatchText}>Low Match</Text>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: 24 }}>
              <Text style={styles.empty}>No one nearby yet</Text>
              <Text style={styles.hint}>Tap Start to begin scanning. Keep Bluetooth on.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0a0a' },
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  brandHeader: { 
    paddingHorizontal: 20, 
    paddingTop: 8, 
    paddingBottom: 12,
  },
  brandText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingBottom: 12,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#aaa', fontSize: 13, marginTop: 4 },
  scanButton: {
    backgroundColor: '#0066ff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scanButtonActive: {
    backgroundColor: '#ff3b30',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#ff3b3020',
    borderLeftWidth: 3,
    borderLeftColor: '#ff3b30',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
  },
  metaBar: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderBottomColor: '#1a1a1a', 
    borderBottomWidth: 1,
    backgroundColor: '#0f0f0f',
  },
  metaText: { color: '#888', fontSize: 12, fontWeight: '500' },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderBottomColor: '#1a1a1a', 
    borderBottomWidth: 1,
    backgroundColor: '#0a0a0a',
  },
  id: { color: '#ddd', fontFamily: 'Courier', fontSize: 13 },
  rowSub: { color: '#888', fontSize: 12, marginTop: 2 },
  signalBarContainer: { 
    width: 70, 
    height: 6, 
    backgroundColor: '#1a1a1a', 
    borderRadius: 3, 
    overflow: 'hidden', 
    marginRight: 8,
  },
  signalBar: { height: '100%', backgroundColor: '#34c759' },
  checkButton: {
    backgroundColor: '#0066ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  linkButton: {
    backgroundColor: '#34c759',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  checkingText: {
    color: '#0066ff',
    fontSize: 12,
    fontWeight: '500',
  },
  noMatchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noMatchText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  compatScore: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  compatGood: {
    color: '#34c759',
  },
  compatBad: {
    color: '#ff6b6b',
  },
  empty: { color: '#bbb', fontSize: 15, marginBottom: 6, textAlign: 'center' },
  hint: { color: '#777', fontSize: 13, textAlign: 'center' },
});

