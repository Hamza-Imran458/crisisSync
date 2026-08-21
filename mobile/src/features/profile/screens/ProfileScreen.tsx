import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SectionHeader } from '../../../shared/components/ui/SectionHeader';
import { Button } from '../../../shared/components/ui/Button';
import { TextInput } from '../../../shared/components/ui/TextInput';
import { SelectChip } from '../../../shared/components/ui/SelectChip';
import { theme } from '../../../shared/theme/theme';
import { useAppStore } from '../../../shared/state/appStore';
import { profileService } from '../../../shared/services/profileService';
import { formatRelativeTime, normalizeIncidentStatus } from '../../../shared/utils/incidentWorkflow';
import type { RootStackParamList } from '../../../app/navigation/types';

const RADIUS_OPTIONS = [1, 3, 5, 10, 20];

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, setProfile, myIncidents, signOut, session } = useAppStore();

  // Editable form state mirrors the profile
  const [name, setName] = useState(profile.name);
  const [radiusKm, setRadiusKm] = useState(profile.notificationRadiusKm);
  const [alertsEnabled, setAlertsEnabled] = useState(profile.alertsEnabled);
  const [smsEnabled, setSmsEnabled] = useState(profile.smsBackupEnabled);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Sync local form state if the profile is loaded from store after mount
  useEffect(() => {
    setName(profile.name);
    setRadiusKm(profile.notificationRadiusKm);
    setAlertsEnabled(profile.alertsEnabled);
    setSmsEnabled(profile.smsBackupEnabled);
  }, [profile.name, profile.notificationRadiusKm, profile.alertsEnabled, profile.smsBackupEnabled]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await profileService.updateUserProfile({
        name,
        notificationRadiusKm: radiusKm,
        alertsEnabled,
        smsBackupEnabled: smsEnabled,
      });
      if (updated) {
        setProfile(updated);
        Alert.alert('Saved', 'Your preferences have been updated.');
      }
    } catch (error: any) {
      Alert.alert('Save failed', error?.message ?? 'Unable to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of CrisisSync?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setSigningOut(true);
              await signOut();
              // Navigation is handled automatically by AppNavigator reacting to session = null
            } catch (error) {
              Alert.alert('Error', 'Unable to sign out. Please try again.');
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'High': return theme.colors.error;
      case 'Medium': return theme.colors.warning;
      default: return theme.colors.primary;
    }
  };

  const statusColor = (status: string) => {
    const normalized = normalizeIncidentStatus(status);
    if (normalized === 'VERIFIED' || normalized === 'ACTIVE') return theme.colors.success;
    if (normalized === 'REJECTED') return theme.colors.error;
    return theme.colors.textMuted;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* HERO */}
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>CRISIS SYNC</Text>
          <Text style={styles.heroTitle}>
            {profile.name ? profile.name : session?.user?.email ?? 'Citizen'}
          </Text>
          <Text style={styles.heroSubtitle}>{session?.user?.email ?? ''}</Text>
        </View>

        {/* PREFERENCES */}
        <SectionHeader title="Emergency Preferences" subtitle="Manage your alert settings" />
        <View style={styles.card}>
          <TextInput
            label="Display Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            maxLength={60}
          />

          <View style={styles.sectionSpacer} />

          <Text style={styles.fieldLabel}>Notification Radius</Text>
          <View style={styles.chipsRow}>
            {RADIUS_OPTIONS.map((km) => (
              <SelectChip
                key={km}
                label={`${km} km`}
                selected={radiusKm === km}
                onPress={() => setRadiusKm(km)}
              />
            ))}
          </View>

          <View style={styles.sectionSpacer} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleLabel}>Push Alerts</Text>
              <Text style={styles.toggleSubtext}>Receive emergency notifications</Text>
            </View>
            <Switch
              value={alertsEnabled}
              onValueChange={setAlertsEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.softBlue }}
              thumbColor={alertsEnabled ? theme.colors.primary : theme.colors.textMuted}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleLabel}>SMS Backup</Text>
              <Text style={styles.toggleSubtext}>Fall back to SMS if network is unavailable</Text>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={setSmsEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.softBlue }}
              thumbColor={smsEnabled ? theme.colors.primary : theme.colors.textMuted}
            />
          </View>
        </View>

        <Button
          title={saving ? 'Saving...' : 'Save Preferences'}
          variant="primary"
          onPress={handleSave}
          disabled={saving}
        />

        {session && (
          <Button
            title="My Assignments"
            variant="secondary"
            onPress={() => navigation.navigate('OperatorResponses')}
          />
        )}

        {/* MY REPORTS */}
        <SectionHeader title="My Reports" subtitle="Status of your submitted incidents" />
        {myIncidents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptyText}>
              Incidents you report will appear here so you can track their review status.
            </Text>
          </View>
        ) : (
          myIncidents.map((incident) => {
            const normalized = normalizeIncidentStatus(incident.status);
            return (
              <TouchableOpacity
                key={incident.id}
                style={styles.reportCard}
                onPress={() => navigation.navigate('IncidentDetail', { incidentId: incident.id, incidentData: incident })}
                activeOpacity={0.8}
              >
                <View style={styles.reportCardHeader}>
                  <Text style={styles.reportTitle} numberOfLines={1}>{incident.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(incident.status) + '22' }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor(incident.status) }]}>
                      {normalized}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reportMeta}>
                  {incident.category || 'Other'} · <Text style={{ color: severityColor(incident.severity) }}>{incident.severity}</Text> · {formatRelativeTime(incident.createdAt)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* SIGN OUT */}
        <View style={styles.signOutSection}>
          <Button
            title={signingOut ? 'Signing out...' : 'Sign Out'}
            variant="outline"
            onPress={handleSignOut}
            disabled={signingOut}
          />
          <Text style={styles.signOutNote}>You will be returned to the login screen.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  heroCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  eyebrow: {
    color: theme.colors.softBlue,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: theme.typography.h2,
    fontWeight: '800',
    color: theme.colors.white,
  },
  heroSubtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.softBlue,
    opacity: 0.85,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  fieldLabel: {
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  sectionSpacer: {
    height: theme.spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  toggleLabel: {
    fontSize: theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  toggleSubtext: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  emptyTitle: {
    fontSize: theme.typography.h3,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  reportCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  reportTitle: {
    flex: 1,
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportMeta: {
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
  },
  signOutSection: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  signOutNote: {
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
