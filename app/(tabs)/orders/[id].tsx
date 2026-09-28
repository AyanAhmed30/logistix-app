import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  FadeIn,
  ScreenContainer,
  SectionHeader,
  TrackingTimeline,
} from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { APP_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';
import {
  buildOrderTrackingTimeline,
  getCustomerOrder,
  shipmentStatusLabel,
  type ShipmentStatus,
} from '@/services/orders';

function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return String(amount);
  }
}

function statusTone(status: ShipmentStatus): { bg: string; fg: string; label: string } {
  switch (status) {
    case 'tracking_and_photo':
    case 'tracking_added':
    case 'photo_uploaded':
      return {
        bg: colors.successLight,
        fg: colors.success,
        label: 'At warehouse',
      };
    case 'accepted_pending':
      return {
        bg: colors.warningLight,
        fg: colors.warning,
        label: 'Awaiting warehouse inward',
      };
    default:
      return {
        bg: colors.infoLight,
        fg: colors.info,
        label: shipmentStatusLabel(status),
      };
  }
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Array.isArray(id) ? id[0] : id;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customer-order', sessionToken, orderId],
    enabled: Boolean(sessionToken && orderId),
    queryFn: async () => {
      const result = await getCustomerOrder(sessionToken!, orderId!);
      if (result.error || !result.data) {
        throw result.error || new Error('order_not_found');
      }
      return result.data;
    },
  });

  const timeline = useMemo(
    () => (data ? buildOrderTrackingTimeline(data) : []),
    [data],
  );

  if (isLoading && !data) {
    return (
      <ScreenContainer title="Order" subtitle="Loading…">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (isError || !data) {
    return (
      <ScreenContainer title="Order" subtitle="Not found">
        <EmptyState
          icon="cube-outline"
          title="Order not found"
          description={
            error instanceof Error
              ? error.message
              : 'This accepted quotation is not available for your account.'
          }
          actionLabel="Back to orders"
          onActionPress={() => router.replace(APP_ROUTES.orders as Href)}
        />
      </ScreenContainer>
    );
  }

  const tone = statusTone(data.shipmentStatus);
  const needsInfo = data.shipmentStatus === 'accepted_pending';
  const atWarehouse = Boolean(data.trackingNumber || data.parcelPhotoUrl);

  return (
    <ScreenContainer
      title={data.productService || 'Order'}
      subtitle="Shipment tracking"
      headerRight={
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backLink}>Back</Text>
        </Pressable>
      }
    >
      <FadeIn>
        <View style={[styles.banner, { backgroundColor: tone.bg }]}>
          <Text style={[styles.bannerTitle, { color: tone.fg }]}>{tone.label}</Text>
          <Text style={styles.bannerBody}>
            {atWarehouse
              ? 'Parcel information is on file — marked received / inward at warehouse.'
              : 'Accept is done. Add tracking or a parcel photo to mark warehouse inward.'}
          </Text>
        </View>
      </FadeIn>

      <FadeIn delay={40}>
        <SectionHeader title="Tracking timeline" />
        <Card>
          <TrackingTimeline events={timeline} />
        </Card>
      </FadeIn>

      <FadeIn delay={80}>
        <SectionHeader title="Order summary" />
        <Card>
          <FactRow label="Amount" value={formatMoney(data.totalAmount)} />
          <FactRow label="Sales agent" value={data.salespersonName || '—'} />
          <FactRow
            label="Tracking number"
            value={data.trackingNumber || 'Not added'}
          />
          <FactRow
            label="Parcel photo"
            value={data.parcelPhotoUrl ? 'Uploaded' : 'Not uploaded'}
            last={!data.parcelPhotoUrl}
          />
          {data.parcelPhotoUrl ? (
            <Pressable
              onPress={() => void Linking.openURL(data.parcelPhotoUrl!)}
              style={styles.photoWrap}
            >
              <Image source={{ uri: data.parcelPhotoUrl }} style={styles.photo} />
              <Text style={styles.photoLink}>View parcel photo</Text>
            </Pressable>
          ) : null}
        </Card>
      </FadeIn>

      <View style={styles.actions}>
        {data.inquiryId ? (
          <Button
            label={needsInfo ? 'Add Tracking Information' : 'Update Shipment Information'}
            fullWidth
            onPress={() =>
              router.push(APP_ROUTES.inquiryShipment(data.inquiryId!) as Href)
            }
          />
        ) : null}
        {data.pdfUrl ? (
          <Button
            label="Open Quotation PDF"
            variant="outline"
            fullWidth
            onPress={() => void Linking.openURL(data.pdfUrl!)}
          />
        ) : null}
        <Button label="Refresh" variant="ghost" fullWidth onPress={() => refetch()} />
      </View>
    </ScreenContainer>
  );
}

function FactRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.factRow, !last && styles.factBorder]}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
  },
  backLink: {
    ...typography.label,
    color: colors.accent,
  },
  banner: {
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerTitle: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  bannerBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  factRow: {
    paddingVertical: spacing.md,
  },
  factBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  factLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 4,
  },
  factValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  photoWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  photoLink: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.huge,
  },
});
