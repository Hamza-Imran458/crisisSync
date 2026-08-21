import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../app/navigation/types';
import { theme } from '../../../shared/theme/theme';
import { formatRelativeTime } from '../../../shared/utils/incidentWorkflow';

type Props = NativeStackScreenProps<RootStackParamList, 'AlertDetail'>;

export function AlertDetailScreen({ route, navigation }: Props) {
  const { alertData } = route.params;

  if (!alertData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: Alert data not found.</Text>
      </View>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return theme.colors.error;
      case 'warning': return theme.colors.warning;
      default: return theme.colors.info;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { borderTopColor: getSeverityColor(alertData.severity), borderTopWidth: 4 }]}>
        <Text style={styles.title}>{alertData.title}</Text>
        <Text style={[styles.badge, { backgroundColor: getSeverityColor(alertData.severity) }]}>
          {alertData.severity.toUpperCase()}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Message</Text>
        <Text style={styles.description}>{alertData.body}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Issued:</Text>
          <Text style={styles.value}>{formatRelativeTime(alertData.createdAt)}</Text>
        </View>
        
        {/* If we had related incident linking, we would render a button here */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Recommended Action</Text>
          <Text style={styles.description}>
            {alertData.severity === 'emergency' ? 'Evacuate or seek immediate shelter. Follow local authority instructions.' :
             alertData.severity === 'warning' ? 'Stay alert and monitor local news. Prepare to take action.' :
             'No immediate action required. Stay informed.'}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Return to Alerts</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textMuted,
    lineHeight: 24,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 60,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  value: {
    flex: 1,
    color: theme.colors.textMuted,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
  },
  backButton: {
    marginTop: 32,
    padding: 16,
    backgroundColor: theme.colors.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: theme.colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  }
});
