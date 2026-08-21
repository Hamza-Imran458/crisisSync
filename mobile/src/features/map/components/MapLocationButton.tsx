import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { theme } from '../../../shared/theme/theme';

type MapLocationButtonProps = {
  onPress: () => void;
  hasLocation: boolean;
};

/**
 * Floating action button that centers the map on the user's current location.
 * Communicates location availability via visual state.
 */
export function MapLocationButton({
  onPress,
  hasLocation,
}: MapLocationButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Center map on my location"
      accessibilityHint={
        hasLocation
          ? 'Centers the map on your current location'
          : 'Location permission may be required'
      }
      onPress={onPress}
      style={[styles.button, !hasLocation && styles.buttonDim]}
      activeOpacity={0.8}
    >
      {/* Location crosshair using Unicode — consistent with Phase 2 icon language */}
      <Text style={styles.icon}>{hasLocation ? '⊙' : '◎'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
    elevation: 6,
  },
  buttonDim: {
    opacity: 0.7,
  },
  icon: {
    fontSize: 22,
    color: theme.colors.primary,
    lineHeight: 26,
    textAlign: 'center',
  },
});
