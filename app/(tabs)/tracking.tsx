import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  CardDescription,
  CardTitle,
  MapPlaceholder,
  ProgressBar,
  ScreenContainer,
  SectionHeader,
  StatusBadge,
  TrackingTimeline,
} from '@/components/ui';
import { mockActiveShipment, mockRecentTrackingIds } from '@/data/mock/tracking';
import { colors, radius, spacing, typography } from '@/constants/theme';

/**
 * Tracking Screen
 *
 * Purpose: Shipment visibility — map preview, progress, and event timeline.
 * Shows how real-time tracking will look using mock shipment data.
 */
export default function TrackingScreen() {
  const [selectedId, setSelectedId] = useState(mockActiveShipment.id);
  const shipment = mockActiveShipment;

  const handleShareTracking = () => {
    // UI placeholder
  };

  return (
    <ScreenContainer title="Tracking" subtitle="Monitor shipment progress">
      <View style={styles.shipmentTabs}>
        {mockRecentTrackingIds.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedId(item.id)}
              style={[styles.shipmentTab, isSelected && styles.shipmentTabActive]}
            >
              <Text style={[styles.tabRef, isSelected && styles.tabRefActive]}>
                {item.reference}
              </Text>
              <Text style={[styles.tabEta, isSelected && styles.tabEtaActive]}>{item.eta}</Text>
            </Pressable>
          );
        })}
      </View>

      <MapPlaceholder origin={shipment.origin} destination={shipment.destination} />

      <Card>
        <View style={styles.shipmentHeader}>
          <View>
            <CardTitle>{shipment.reference}</CardTitle>
            <CardDescription>{shipment.carrier}</CardDescription>
          </View>
          <StatusBadge status={shipment.status} />
        </View>

        <ProgressBar progress={shipment.progress} label="Delivery progress" />

        <View style={styles.etaRow}>
          <View style={styles.etaItem}>
            <Text style={styles.etaLabel}>Estimated delivery</Text>
            <Text style={styles.etaValue}>{shipment.estimatedDelivery}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={handleShareTracking}
            style={styles.shareBtn}
          >
            <Text style={styles.shareBtnText}>Share</Text>
          </Pressable>
        </View>
      </Card>

      <View style={styles.routeCard}>
        <View style={styles.routeItem}>
          <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
          <View>
            <Text style={styles.routeLabel}>Origin</Text>
            <Text style={styles.routeValue}>{shipment.origin}</Text>
          </View>
        </View>
        <View style={styles.routeDivider} />
        <View style={styles.routeItem}>
          <View style={[styles.routeDot, { backgroundColor: colors.success }]} />
          <View>
            <Text style={styles.routeLabel}>Destination</Text>
            <Text style={styles.routeValue}>{shipment.destination}</Text>
          </View>
        </View>
      </View>

      <View>
        <SectionHeader title="Tracking History" />
        <Card style={styles.timelineCard}>
          <TrackingTimeline events={shipment.events} />
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  shipmentTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shipmentTab: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  shipmentTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabRef: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text,
  },
  tabRefActive: {
    color: colors.surface,
  },
  tabEta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  tabEtaActive: {
    color: 'rgba(255,255,255,0.75)',
  },
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  etaItem: {
    flex: 1,
  },
  etaLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  etaValue: {
    ...typography.label,
    color: colors.text,
    marginTop: 2,
  },
  shareBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  shareBtnText: {
    ...typography.label,
    color: colors.primary,
  },
  routeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  routeValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  routeDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing.lg,
  },
  timelineCard: {
    paddingTop: spacing.sm,
  },
});
