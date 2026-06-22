import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { TrackingEvent } from '@/types/ui';

type TrackingTimelineProps = {
  events: TrackingEvent[];
};

export function TrackingTimeline({ events }: TrackingTimelineProps) {
  return (
    <View style={styles.container}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        return (
          <View key={event.id} style={styles.row}>
            <View style={styles.indicatorColumn}>
              <View
                style={[
                  styles.dot,
                  event.active && styles.dotActive,
                  event.completed && !event.active && styles.dotCompleted,
                  !event.completed && !event.active && styles.dotPending,
                ]}
              >
                {event.completed && !event.active ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              {!isLast ? (
                <View
                  style={[styles.line, event.completed ? styles.lineCompleted : styles.linePending]}
                />
              ) : null}
            </View>
            <View style={[styles.content, !isLast && styles.contentSpaced]}>
              <Text style={[styles.title, event.active && styles.titleActive]}>{event.title}</Text>
              <Text style={styles.description}>{event.description}</Text>
              <View style={styles.meta}>
                <Text style={styles.location}>{event.location}</Text>
                <Text style={styles.timestamp}>{event.timestamp}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
  },
  indicatorColumn: {
    width: 28,
    alignItems: 'center',
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    width: 24,
    height: 24,
  },
  dotCompleted: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  dotPending: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  checkmark: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '700',
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 40,
    marginVertical: spacing.xs,
  },
  lineCompleted: {
    backgroundColor: colors.success,
  },
  linePending: {
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
    paddingLeft: spacing.md,
  },
  contentSpaced: {
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.label,
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  titleActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  description: {
    ...typography.bodySmall,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  meta: {
    gap: spacing.xs,
  },
  location: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
