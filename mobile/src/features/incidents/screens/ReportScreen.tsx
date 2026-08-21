import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../shared/components/ui/Button';
import { SectionHeader } from '../../../shared/components/ui/SectionHeader';
import { SelectChip } from '../../../shared/components/ui/SelectChip';
import { TextInput } from '../../../shared/components/ui/TextInput';
import { theme } from '../../../shared/theme/theme';
import { useAppStore } from '../../../shared/state/appStore';
import { submitIncident } from '../../../shared/services/incidentService';
import { validateIncidentInput } from '../../../shared/utils/incidentWorkflow';
import { getUserLocationForApp } from '../../../shared/services/incidentIntelligenceService';
import { logger } from '../../../shared/utils/logger';

const CATEGORIES = [
  'Fire',
  'Medical Emergency',
  'Accident',
  'Security Threat',
  'Natural Disaster',
  'Infrastructure Failure',
  'Other'
];

export function ReportScreen() {
  const { addIncident } = useAppStore();
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Other');
  const [selectedSeverity, setSelectedSeverity] = useState('Medium');
  
  // Location State
  const [locationLabel, setLocationLabel] = useState('Acquiring location...');
  const [coordinates, setCoordinates] = useState<{latitude: number | null; longitude: number | null}>({ latitude: null, longitude: null });
  const [distanceKm, setDistanceKm] = useState(0.5); // Default assumed distance for new reports if unknown
  
  // UI State
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Attempt to get location on mount
    let mounted = true;
    (async () => {
      try {
        const loc = await getUserLocationForApp();
        if (!mounted) return;
        
        if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && !('permissionDenied' in loc && loc.permissionDenied)) {
          setCoordinates({ latitude: loc.latitude, longitude: loc.longitude });
          setLocationLabel('GPS Location Acquired');
        } else if ('permissionDenied' in loc && loc.permissionDenied) {
          setLocationLabel('Location Permission Denied');
        } else {
          setLocationLabel('Location Unavailable');
        }
      } catch (err) {
        logger.warn('ReportScreen: failed to get location on mount', err);
        if (mounted) setLocationLabel('Location Unavailable');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const validation = useMemo(
    () =>
      validateIncidentInput({
        title,
        description,
        category: selectedCategory,
        severity: selectedSeverity as 'High' | 'Medium' | 'Low',
        location: locationLabel,
        distanceKm,
      }),
    [title, description, locationLabel, selectedSeverity, selectedCategory, distanceKm]
  );

  const handleSubmit = async () => {
    if (!validation.isValid) {
      Alert.alert('Incomplete report', validation.errors.join('\n'));
      return;
    }

    setSubmitting(true);

    try {
      let lat = coordinates.latitude;
      let lng = coordinates.longitude;
      
      // Fallback location check if missed on mount
      if (lat === null || lng === null) {
        const loc = await getUserLocationForApp();
        if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && (!('permissionDenied' in loc) || !loc.permissionDenied)) {
          lat = loc.latitude;
          lng = loc.longitude;
          setCoordinates({ latitude: lat, longitude: lng });
          setLocationLabel('GPS Location Acquired');
        }
      }

      const finalCategory = selectedCategory.trim() === '' ? 'Other' : selectedCategory;

      const savedIncident = await submitIncident({
        title,
        description,
        category: finalCategory,
        severity: selectedSeverity as 'High' | 'Medium' | 'Low',
        location: locationLabel,
        latitude: lat,
        longitude: lng,
        distanceKm,
        status: 'Pending',
      });

      addIncident(savedIncident);

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedCategory('Other');
      setSelectedSeverity('Medium');

      Alert.alert('Success', 'Incident reported successfully and sent for review.');
    } catch (error: any) {
      logger.error('Report submission failed:', error);
      Alert.alert('Unable to submit report', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* HERO */}
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>CRISIS SYNC</Text>
          <Text style={styles.heroTitle}>Report an Incident</Text>
          <Text style={styles.heroSubtitle}>
            Provide accurate information to help responders assess the situation quickly.
          </Text>
        </View>

        {/* DETAILS SECTION */}
        <SectionHeader title="Incident Details" subtitle="Describe what is happening" />
        <View style={styles.card}>
          <TextInput
            label="Incident Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Flooding on Main St"
            maxLength={50}
          />
          
          <View style={styles.inputGap} />

          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Provide specific details about the situation, hazards, and people involved..."
            multiline={true}
            numberOfLines={4}
            maxLength={500}
          />
        </View>

        {/* CLASSIFICATION SECTION */}
        <SectionHeader title="Classification" subtitle="Optional categorization" />
        <View style={styles.card}>
          <Text style={styles.label}>Severity</Text>
          <View style={styles.chipsRow}>
            <SelectChip label="High" selected={selectedSeverity === 'High'} onPress={() => setSelectedSeverity('High')} />
            <SelectChip label="Medium" selected={selectedSeverity === 'Medium'} onPress={() => setSelectedSeverity('Medium')} />
            <SelectChip label="Low" selected={selectedSeverity === 'Low'} onPress={() => setSelectedSeverity('Low')} />
          </View>
          
          <View style={styles.inputGap} />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipsRow}>
            {CATEGORIES.map(cat => (
              <SelectChip 
                key={cat} 
                label={cat} 
                selected={selectedCategory === cat} 
                onPress={() => setSelectedCategory(cat)} 
              />
            ))}
          </View>
        </View>

        {/* LOCATION SECTION */}
        <SectionHeader title="Location" subtitle="Your current position is attached" />
        <View style={styles.card}>
          <Text style={styles.label}>Coordinates</Text>
          <Text style={styles.value}>
            {coordinates.latitude != null && coordinates.longitude != null 
              ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
              : locationLabel}
          </Text>
        </View>

        {/* NOTICE & SUBMIT */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Professional workflow</Text>
          <Text style={styles.noticeText}>
            Reports are verified by administrators before becoming active in the public system to prevent misinformation.
          </Text>
        </View>

        <Button 
          title={submitting ? 'Submitting report...' : 'Submit Report'} 
          variant="primary"
          onPress={handleSubmit} 
          disabled={submitting}
        />

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
    fontSize: theme.typography.h1,
    fontWeight: '800',
    color: theme.colors.white,
  },
  heroSubtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.softBlue,
    lineHeight: 22,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  inputGap: {
    height: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  noticeCard: {
    backgroundColor: theme.colors.softBlue,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.md,
  },
  noticeTitle: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
});
