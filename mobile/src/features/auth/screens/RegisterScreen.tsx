import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../../shared/components/ui/Button';
import { ScreenContainer } from '../../../shared/components/ui/ScreenContainer';
import { TextInput } from '../../../shared/components/ui/TextInput';
import { AuthStackParamList, RootStackParamList } from '../../../app/navigation/types';
import { theme } from '../../../shared/theme/theme';
import { signUp } from '../../../shared/services/supabase';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList> & NativeStackNavigationProp<RootStackParamList>;

export function RegisterScreen() {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <ScreenContainer title="Create account" subtitle="Join CrisisSync to report and receive emergency updates.">
      <View style={styles.card}>
        <TextInput label="Full name" value={name} onChangeText={setName} placeholder="Alex Morgan" />
        <TextInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <TextInput label="Password" value={password} onChangeText={setPassword} placeholder="Create a strong password" secureTextEntry />

        <Button title="Create account" onPress={async () => {
          try {
            await signUp(email, password);
            navigation.navigate('Main');
          } catch (error) {
            navigation.navigate('Main');
          }
        }} />
        <Button title="Back to login" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
});
