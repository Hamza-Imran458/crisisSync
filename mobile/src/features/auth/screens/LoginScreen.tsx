import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../../shared/components/ui/Button';
import { ScreenContainer } from '../../../shared/components/ui/ScreenContainer';
import { TextInput } from '../../../shared/components/ui/TextInput';
import { AuthStackParamList } from '../../../app/navigation/types';
import { theme } from '../../../shared/theme/theme';
import { signIn } from '../../../shared/services/supabase';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;
    setLoading(true);
    try {
      await signIn(email, password);
      // No navigate() call needed here.
      // AppNavigator's RootNavigator listens to session state in AppStore
      // and automatically switches to the Main stack when the user signs in.
    } catch (error: any) {
      Alert.alert('Login Failed', error?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer
      title="Welcome back"
      subtitle="Sign in to report incidents, review alerts, and stay informed."
    >
      <View style={styles.card}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
        />

        <Button
          title={loading ? 'Signing in…' : 'Login'}
          onPress={handleLogin}
        />
        <Button
          title="Create account"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
        />

        <Text
          style={styles.link}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          Forgot password?
        </Text>
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
  link: {
    color: theme.colors.primary,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
