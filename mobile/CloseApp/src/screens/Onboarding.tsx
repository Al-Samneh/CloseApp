import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createEmptyProfile, saveProfile } from '../storage/profile';
import { useNavigation } from '@react-navigation/native';

export default function Onboarding() {
  const nav = useNavigation<any>();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [prefMale, setPrefMale] = useState<boolean>(false);
  const [prefFemale, setPrefFemale] = useState<boolean>(false);
  const [prefOther, setPrefOther] = useState<boolean>(false);
  
  const [instagram, setInstagram] = useState('');
  const [interests, setInterests] = useState('');
  const insets = useSafeAreaInsets();

  const onContinue = async () => {
    const p = createEmptyProfile();
    p.name = name.trim();
    p.age = Number(age) || 18;
    p.sex = (gender || 'other');
    const prefGenders: Array<'male'|'female'|'other'> = [];
    if (prefMale) prefGenders.push('male');
    if (prefFemale) prefGenders.push('female');
    if (prefOther) prefGenders.push('other');
    if (prefGenders.length === 0) {
      // Require at least one preference to be selected
      // Use Alert from react-native to avoid lint error
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Alert } = require('react-native');
      Alert.alert('Selection required', 'Please select who you are interested in.');
      return;
    }
    p.preference.gender = prefGenders;
    p.socials_encrypted = instagram.trim() ? `@${instagram.trim().replace('@', '')}` : undefined;
    p.interests = interests.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    await saveProfile(p as any);
    nav.reset({ index: 0, routes: [{ name: 'Home' as never }] });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 12 + insets.bottom, paddingHorizontal: 16 }}
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
            <TextInput placeholder="Age" value={age} onChangeText={setAge} keyboardType="number-pad" style={styles.input} placeholderTextColor="#666" />
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
            <Text style={styles.label}>Who are you interested in?</Text>
            <View style={styles.genderButtons}>
              <TouchableOpacity 
                style={[styles.genderButton, prefMale && styles.genderButtonActive]}
                onPress={() => setPrefMale(v => !v)}
              >
                <Text style={[styles.genderButtonText, prefMale && styles.genderButtonTextActive]}>Men</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.genderButton, prefFemale && styles.genderButtonActive]}
                onPress={() => setPrefFemale(v => !v)}
              >
                <Text style={[styles.genderButtonText, prefFemale && styles.genderButtonTextActive]}>Women</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.genderButton, prefOther && styles.genderButtonActive]}
                onPress={() => setPrefOther(v => !v)}
              >
                <Text style={[styles.genderButtonText, prefOther && styles.genderButtonTextActive]}>Other</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.group}>
            <Text style={styles.label}>Instagram (optional)</Text>
            <TextInput placeholder="username" value={instagram} onChangeText={setInstagram} style={styles.input} placeholderTextColor="#666" autoCapitalize="none" />
          </View>
          
          <View style={styles.group}>
            <Text style={styles.label}>Interests</Text>
            <TextInput placeholder="e.g., music, books" value={interests} onChangeText={setInterests} style={styles.input} placeholderTextColor="#666" />
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
    paddingVertical: 16,
    marginBottom: 8,
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
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  group: { marginBottom: 12 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 8, letterSpacing: 0.3, fontWeight: '500' },
  input: { 
    backgroundColor: '#1a1a1a', 
    color: '#fff', 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    borderRadius: 12,
    fontSize: 16,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  continueButton: {
    backgroundColor: '#0066ff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
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

