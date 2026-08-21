import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../../shared/state/appStore';
import { theme } from '../../../shared/theme/theme';

/**
 * AdminGuard
 *
 * Route-level protection for the Admin area.
 *
 * Renders children only when the current user has an admin
 * or operator role as determined by the Supabase `profiles.role`
 * column — the established role architecture.
 *
 * If a non-admin somehow reaches this route (e.g. via a deeplink
 * or a navigation workaround) they will see a clear Access Denied
 * screen rather than the admin interface.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, authLoading, session } = useAppStore();

  // Session is still being determined — show nothing to avoid flash.
  if (authLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Verifying access…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // User is not authenticated at all.
  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.denyCard}>
            <Text style={styles.denyIcon}>🔒</Text>
            <Text style={styles.denyTitle}>Authentication Required</Text>
            <Text style={styles.denySubtitle}>
              You must be signed in to access this area.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // User is authenticated but does not have an admin role.
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.denyCard}>
            <Text style={styles.denyIcon}>🚫</Text>
            <Text style={styles.denyTitle}>Access Denied</Text>
            <Text style={styles.denySubtitle}>
              You do not have permission to access the admin area.
              Contact your system administrator if you believe this
              is an error.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // User is an authenticated admin or operator — allow access.
  return <>{children}</>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  denyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: theme.spacing.md,
    maxWidth: 320,
    width: '100%',
  },
  denyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.xs,
  },
  denyTitle: {
    fontSize: theme.typography.h3,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  denySubtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
