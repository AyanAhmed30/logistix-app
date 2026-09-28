import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

type FilterChip = {
  id: string;
  label: string;
};

type FilterChipsProps = {
  chips: FilterChip[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Equal-width row (no scroll / no checkmark). Use for primary tabs. */
  variant?: 'scroll' | 'segmented';
};

export function FilterChips({
  chips,
  selectedId,
  onSelect,
  variant = 'scroll',
}: FilterChipsProps) {
  if (variant === 'segmented') {
    return (
      <View style={styles.segmentedRow}>
        {chips.map((chip) => {
          const isSelected = chip.id === selectedId;
          return (
            <Pressable
              key={chip.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(chip.id)}
              style={[styles.segment, isSelected && styles.segmentSelected]}
            >
              <Text
                style={[styles.segmentLabel, isSelected && styles.segmentLabelSelected]}
                numberOfLines={1}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      {chips.map((chip, index) => {
        const isSelected = chip.id === selectedId;
        const isLast = index === chips.length - 1;
        return (
          <Pressable
            key={chip.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(chip.id)}
            style={[styles.chip, isSelected && styles.chipSelected, !isLast && styles.chipSpacing]}
          >
            {isSelected ? (
              <Ionicons name="checkmark" size={14} color={colors.surface} />
            ) : null}
            <Text style={[styles.label, isSelected && styles.labelSelected]} numberOfLines={1}>
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSpacing: {
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.surface,
  },
  segmentedRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    width: '100%',
    gap: spacing.sm,
    flexShrink: 0,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  segmentLabelSelected: {
    color: colors.surface,
  },
});
