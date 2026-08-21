import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../../shared/components/ui/Button';
import { ScreenContainer } from '../../../shared/components/ui/ScreenContainer';
import { TextInput } from '../../../shared/components/ui/TextInput';
import { AuthStackParamList } from '../../../app/navigation/types';
import { theme } from '../../../shared/theme/theme';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const [email, setEmail] = useState('');

  return (
    <ScreenContainer title="Reset password" subtitle="Enter your email and we will guide you through recovery.">
      <View style={styles.card}>
        <TextInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Button title="Send reset link" onPress={() => navigation.goBack()} />
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
