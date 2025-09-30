import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createEmptyProfile, saveProfile } from '../storage/profile';
import { useNavigation } from '@react-navigation/native';

export default function Onboarding() {
  const nav = useNavigation<any>();
  const [name, setName] = useState('');
  const [age, setAge] = useState('25');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('other');
  const [instagram, setInstagram] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('music,books');
  const insets = useSafeAreaInsets();

  const onContinue = async () => {
    const p = createEmptyProfile();
    p.name = name.trim();
    p.age = Number(age) || 18;
    p.sex = gender;
    p.socials_encrypted = instagram.trim() ? `@${instagram.trim().replace('@', '')}` : undefined;
    p.bio = bio;
    p.interests = interests.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    await saveProfile(p as any);
    nav.reset({ index: 0, routes: [{ name: 'Home' as never }] });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 16 + insets.bottom, paddingHorizontal: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* BIG Close branding */}
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>Close</Text>
            <Text style={styles.tagline}>Connect with people nearby</Text>
          </View>

          <Text style={styles.title}>Create your profile</Text>
          <View style={styles.group}>
            <Text style={styles.label}>Name</Text>
            <TextInput placeholder="Your name" value={name} onChangeText={setName} style={styles.input} placeholderTextColor="#666" />
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Age</Text>
            <TextInput placeholder="25" value={age} onChangeText={setAge} keyboardType="number-pad" style={styles.input} placeholderTextColor="#666" />
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderButtons}>
              <TouchableOpacity 
                style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]} 
                onPress={() => setGender('male')}
              >
                <Text style={[styles.genderButtonText, gender === 'male' && styles.genderButtonTextActive]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]} 
                onPress={() => setGender('female')}
              >
                <Text style={[styles.genderButtonText, gender === 'female' && styles.genderButtonTextActive]}>Female</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.genderButton, gender === 'other' && styles.genderButtonActive]} 
                onPress={() => setGender('other')}
              >
                <Text style={[styles.genderButtonText, gender === 'other' && styles.genderButtonTextActive]}>Other</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Instagram (optional)</Text>
            <TextInput placeholder="username" value={instagram} onChangeText={setInstagram} style={styles.input} placeholderTextColor="#666" autoCapitalize="none" />
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Bio</Text>
            <TextInput placeholder="A sentence about you" value={bio} onChangeText={setBio} style={[styles.input, styles.textarea]} multiline placeholderTextColor="#666" />
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Interests</Text>
            <TextInput placeholder="music, books" value={interests} onChangeText={setInterests} style={styles.input} placeholderTextColor="#666" />
          </View>
          <View style={{ height: 12 }} />
          <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0a0a' },
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 20,
  },
  logo: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    color: '#888',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 20 },
  group: { marginBottom: 16 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 8, letterSpacing: 0.3, fontWeight: '500' },
  input: { 
    backgroundColor: '#1a1a1a', 
    color: '#fff', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderRadius: 12,
    fontSize: 16,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  continueButton: {
    backgroundColor: '#0066ff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  genderButtonActive: {
    backgroundColor: '#0066ff15',
    borderColor: '#0066ff',
  },
  genderButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: '#0066ff',
    fontWeight: '600',
  },
});

