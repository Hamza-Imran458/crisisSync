import React, { useState } from 'react';
import { StyleSheet, Text, TextInput as RNTextInput, View } from 'react-native';
import { theme } from '../../theme/theme';

type TextInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
};

export function TextInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  maxLength,
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        {maxLength !== undefined && (
          <Text style={styles.charCount}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          multiline && { minHeight: 48 + (numberOfLines - 1) * 20, textAlignVertical: 'top' }
        ]}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={theme.colors.textMuted}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  charCount: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    ...theme.shadows.sm,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.background,
  }
});
