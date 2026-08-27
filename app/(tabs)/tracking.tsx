import { useMemo, useState } from 'react';
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
import { colors, radius, spacing, typography } from '@/constants/theme';
import { mockShipments } from '@/data/mock/customer';

export default function TrackingScreen() {
  const [selectedId, setSelectedId] = useState(mockShipments[0]?.id ?? '');

  const shipment = useMemo(
    () => mockShipments.find((s) => s.id === selectedId) ?? mockShipments[0],
    [selectedId],
  );

  if (!shipment) {
    return (
      <ScreenContainer title="Tracking" subtitle="No active shipments">
        <Text style={styles.empty}>When cargo moves through the warehouse, milestones will appear here.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Tracking" subtitle="Warehouse milestones & transit">
      <View style={styles.shipmentTabs}>
        {mockShipments.map((item) => {
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
              <Text style={[styles.tabEta, isSelected && styles.tabEtaActive]}>
                {item.statusLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <MapPlaceholder origin={shipment.origin} destination={shipment.destination} />

      <Card>
        <View style={styles.shipmentHeader}>
          <View style={styles.headerText}>
            <CardTitle>{shipment.reference}</CardTitle>
            <CardDescription>{shipment.carrier} · Logistix warehouse network</CardDescription>
          </View>
          <StatusBadge status={shipment.status} />
        </View>

        <Text style={styles.explanation}>{shipment.explanation}</Text>

        <ProgressBar progress={shipment.progress} label="Journey progress" />

        <View style={styles.etaRow}>
          <View style={styles.etaItem}>
            <Text style={styles.etaLabel}>Estimated next milestone</Text>
            <Text style={styles.etaValue}>{shipment.estimatedDelivery}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.routeCard}>
        <View style={styles.routeItem}>
          <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
          <View>
            <Text style={styles.routeLabel}>Origin / warehouse</Text>
            <Text style={styles.routeValue}>{shipment.origin}</Text>
          </View>
        </View>
        <View style={styles.routeDivider} />
        <View style={styles.routeItem}>
          <View style={[styles.routeDot, { backgroundColor: colors.accent }]} />
          <View>
            <Text style={styles.routeLabel}>Destination</Text>
            <Text style={styles.routeValue}>{shipment.destination}</Text>
          </View>
        </View>
      </View>

      <View>
        <SectionHeader title="Milestone history" />
        <Card style={styles.timelineCard}>
          <TrackingTimeline events={shipment.events} />
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  empty: {
    ...typography.body,
    color: colors.textSecondary,
  },
  shipmentTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  shipmentTab: {
    flexGrow: 1,
    minWidth: '45%',
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
    fontWeight: '700',
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
    color: 'rgba(255,255,255,0.8)',
  },
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  explanation: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  etaRow: {
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
