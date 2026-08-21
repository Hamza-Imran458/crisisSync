import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../../../shared/theme/theme';
import { getSeverityColor, type SeverityFilter } from '../../../shared/utils/mapUtils';

type FilterOption = {
  key: SeverityFilter;
  label: string;
};

const FILTERS: FilterOption[] = [
  { key: 'ALL', label: 'All' },
  { key: 'High', label: 'High' },
  { key: 'Medium', label: 'Medium' },
  { key: 'Low', label: 'Low' },
];

type MapFilterBarProps = {
  activeFilter: SeverityFilter;
  onFilterChange: (filter: SeverityFilter) => void;
  counts: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
};

export function MapFilterBar({
  activeFilter,
  onFilterChange,
  counts,
}: MapFilterBarProps) {
  const getCount = (key: SeverityFilter): number => {
    switch (key) {
      case 'ALL': return counts.total;
      case 'High': return counts.high;
      case 'Medium': return counts.medium;
      case 'Low': return counts.low;
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollView}
    >
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.key;
        const count = getCount(filter.key);
        const severityColor =
          filter.key === 'ALL'
            ? theme.colors.primary
            : getSeverityColor(filter.key);

        return (
          <TouchableOpacity
            key={filter.key}
            accessibilityRole="button"
            accessibilityLabel={`Show ${filter.label} incidents`}
            accessibilityState={{ selected: isActive }}
            onPress={() => onFilterChange(filter.key)}
            style={[
              styles.chip,
              isActive && { backgroundColor: severityColor, borderColor: severityColor },
            ]}
            activeOpacity={0.7}
          >
            {filter.key !== 'ALL' && (
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive
                      ? theme.colors.white
                      : severityColor,
                  },
                ]}
              />
            )}
            <Text
              style={[
                styles.chipLabel,
                isActive && styles.chipLabelActive,
              ]}
            >
              {filter.label}
            </Text>
            <View
              style={[
                styles.countBadge,
                isActive
                  ? styles.countBadgeActive
                  : { backgroundColor: theme.colors.background },
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  isActive && styles.countTextActive,
                ]}
              >
                {count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    gap: 5,
    ...theme.shadows.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: theme.radius.full,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: 0.1,
  },
  chipLabelActive: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  countBadge: {
    borderRadius: theme.radius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  countTextActive: {
    color: theme.colors.white,
  },
});
