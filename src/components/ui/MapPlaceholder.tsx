import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

type MapPlaceholderProps = {
  origin: string;
  destination: string;
};

export function MapPlaceholder({ origin, destination }: MapPlaceholderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {Array.from({ length: 6 }).map((_, row) => (
          <View key={row} style={styles.gridRow}>
            {Array.from({ length: 8 }).map((__, col) => (
              <View
                key={col}
                style={[styles.gridCell, (row + col) % 3 === 0 && styles.gridCellAlt]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.routeOverlay}>
        <View style={styles.routeLine} />
        <View style={styles.markerOrigin}>
          <Ionicons name="location" size={20} color={colors.primary} />
        </View>
        <View style={styles.markerDestination}>
          <Ionicons name="flag" size={18} color={colors.success} />
        </View>
        <View style={styles.truckMarker}>
          <Ionicons name="bus-outline" size={16} color={colors.surface} />
        </View>
      </View>
      <View style={styles.labelBar}>
        <Text style={styles.labelText} numberOfLines={1}>
          {origin}
        </Text>
        <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
        <Text style={styles.labelText} numberOfLines={1}>
          {destination}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  gridCellAlt: {
    backgroundColor: colors.primaryLight,
  },
  routeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLine: {
    position: 'absolute',
    width: '70%',
    height: 3,
    backgroundColor: colors.primary,
    opacity: 0.3,
    borderRadius: radius.full,
    transform: [{ rotate: '-8deg' }],
  },
  markerOrigin: {
    position: 'absolute',
    left: '12%',
    top: '55%',
    backgroundColor: colors.surface,
    padding: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  markerDestination: {
    position: 'absolute',
    right: '12%',
    top: '30%',
    backgroundColor: colors.surface,
    padding: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.success,
  },
  truckMarker: {
    position: 'absolute',
    left: '48%',
    top: '42%',
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radius.full,
  },
  labelBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  labelText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    maxWidth: '40%',
  },
});
