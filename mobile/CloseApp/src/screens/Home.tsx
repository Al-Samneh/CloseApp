import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { loadProfile } from '../storage/profile';
import { BleOrchestrator } from '../ble/orchestrator';
import { useNavigation } from '@react-navigation/native';

export default function Home() {
  const nav = useNavigation<any>();
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<{ id: string; rssi: number }[]>([]);
  const [ble, setBle] = useState<BleOrchestrator | null>(null);

  useEffect(() => {
    (async () => {
      const p = await loadProfile();
      if (!p) {
        nav.reset({ index: 0, routes: [{ name: 'Onboarding' as never }] });
      }
    })();
    return () => ble?.stop();
  }, []);

  const toggle = async () => {
    const p = await loadProfile();
    if (!p) return;
    if (scanning) {
      ble?.stop();
      setScanning(false);
      return;
    }
    const deviceSecret = new Uint8Array(32);
    crypto.getRandomValues(deviceSecret);
    const orch = new BleOrchestrator(deviceSecret);
    setBle(orch);
    orch.start({ age: p.age, sex: p.sex as any, preferences: { gender: p.preference.gender as any, age_min: p.preference.age_min, age_max: p.preference.age_max }, interests: p.interests }, disc => {
      const id = Buffer.from(disc.payload.slice(1, 9)).toString('hex').slice(0, 12);
      setItems(prev => {
        const ex = prev.find(x => x.id === id);
        if (ex) return prev.map(x => (x.id === id ? { ...x, rssi: disc.rssi } : x));
        return [{ id, rssi: disc.rssi }, ...prev].slice(0, 50);
      });
    });
    setScanning(true);
  };

  const openChat = (id: string) => {
    nav.navigate('Chat' as never, { sessionId: id } as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby</Text>
        <Button title={scanning ? 'Stop' : 'Start'} onPress={toggle} />
      </View>
      <FlatList
        data={items}
        keyExtractor={x => x.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.id}>{item.id}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={styles.rssi}>{item.rssi} dBm</Text>
              <Button title="Chat" onPress={() => openChat(item.id)} />
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No one nearby yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e0e0e' },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 20, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomColor: '#222', borderBottomWidth: 1 },
  id: { color: '#ddd', fontFamily: 'Courier' },
  rssi: { color: '#aaa', alignSelf: 'center' },
  empty: { color: '#777', padding: 16 },
});

