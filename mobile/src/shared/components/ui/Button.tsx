import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme/theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondary;
      case 'outline':
        return styles.outline;
      case 'danger':
        return styles.danger;
      case 'primary':
      default:
        return styles.primary;
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        getVariantStyles(),
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[
        styles.label, 
        variant === 'secondary' && styles.secondaryLabel,
        variant === 'outline' && styles.outlineLabel
      ]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...theme.shadows.sm,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    elevation: 0,
    shadowOpacity: 0,
  },
  danger: {
    backgroundColor: theme.colors.danger,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: theme.typography.body,
  },
  secondaryLabel: {
    color: theme.colors.text,
  },
  outlineLabel: {
    color: theme.colors.primary,
  }
});
