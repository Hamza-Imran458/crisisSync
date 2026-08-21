import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../../../shared/theme/theme';
import { Button } from '../../../shared/components/ui/Button';
import type { Incident } from '../../../shared/types/app';

export type OperatorOption = {
  id: string;
  name: string;
  email?: string;
};

type ResponseAssignModalProps = {
  visible: boolean;
  incident: Incident | null;
  operators: OperatorOption[];
  selectedOperatorId: string;
  notes: string;
  loading?: boolean;
  onSelectOperator: (id: string) => void;
  onNotesChange: (text: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function ResponseAssignModal({
  visible,
  incident,
  operators,
  selectedOperatorId,
  notes,
  loading = false,
  onSelectOperator,
  onNotesChange,
  onClose,
  onConfirm,
}: ResponseAssignModalProps) {
  const selectedOperator = useMemo(
    () => operators.find((operator) => operator.id === selectedOperatorId) ?? null,
    [operators, selectedOperatorId]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>Dispatch Response</Text>

          {incident ? (
            <View style={styles.incidentCard}>
              <Text style={styles.incidentTitle}>{incident.title}</Text>
              <Text style={styles.incidentMeta}>{incident.category || 'General'} • {incident.location || 'Unknown location'}</Text>
              <Text style={styles.incidentMeta}>Status: {incident.status}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Select operator</Text>
          <ScrollView style={styles.operatorList} nestedScrollEnabled>
            {operators.length === 0 ? (
              <Text style={styles.emptyText}>No eligible operators are available.</Text>
            ) : (
              operators.map((operator) => (
                <TouchableOpacity
                  key={operator.id}
                  onPress={() => onSelectOperator(operator.id)}
                  style={[styles.operatorRow, selectedOperatorId === operator.id && styles.operatorRowSelected]}
                >
                  <Text style={styles.operatorName}>{operator.name || operator.email || 'Operator'}</Text>
                  {operator.email ? <Text style={styles.operatorEmail}>{operator.email}</Text> : null}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <Text style={styles.label}>Dispatch notes (optional)</Text>
          <TextInput
            multiline
            numberOfLines={4}
            placeholder="Add dispatch instructions or notes..."
            value={notes}
            onChangeText={onNotesChange}
            style={styles.notesInput}
            placeholderTextColor={theme.colors.textMuted}
          />

          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={onClose} />
            <Button
              title={loading ? 'Dispatching...' : 'Confirm Dispatch'}
              variant="primary"
              onPress={onConfirm}
              disabled={loading || !selectedOperatorId}
            />
          </View>

          {selectedOperator ? (
            <Text style={styles.selectionText}>Selected operator: {selectedOperator.name}</Text>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 23, 38, 0.65)',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: '80%',
  },
  title: {
    fontSize: theme.typography.h3,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  incidentCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  incidentTitle: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  incidentMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  operatorList: {
    maxHeight: 220,
    marginBottom: theme.spacing.md,
  },
  operatorRow: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  operatorRowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.softBlue,
  },
  operatorName: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  operatorEmail: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginVertical: theme.spacing.md,
  },
  notesInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    color: theme.colors.text,
    minHeight: 110,
    padding: theme.spacing.md,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  selectionText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.spacing.sm,
  },
});
