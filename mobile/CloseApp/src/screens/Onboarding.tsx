import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { createEmptyProfile, saveProfile } from '../storage/profile';
import { useNavigation } from '@react-navigation/native';

export default function Onboarding() {
  const nav = useNavigation<any>();
  const [name, setName] = useState('');
  const [age, setAge] = useState('25');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('music,books');

  const onContinue = async () => {
    const p = createEmptyProfile();
    p.name = name.trim();
    p.age = Number(age) || 18;
    p.bio = bio;
    p.interests = interests.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    await saveProfile(p as any);
    nav.reset({ index: 0, routes: [{ name: 'Home' as never }] });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Create your profile</Text>
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} placeholderTextColor="#666" />
      <TextInput placeholder="Age" value={age} onChangeText={setAge} keyboardType="number-pad" style={styles.input} placeholderTextColor="#666" />
      <TextInput placeholder="Bio" value={bio} onChangeText={setBio} style={[styles.input, { height: 80 }]} multiline placeholderTextColor="#666" />
      <TextInput placeholder="Interests (comma separated)" value={interests} onChangeText={setInterests} style={styles.input} placeholderTextColor="#666" />
      <Button title="Continue" onPress={onContinue} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e0e0e' },
  title: { color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 12 },
  input: { backgroundColor: '#1a1a1a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 12 },
});

