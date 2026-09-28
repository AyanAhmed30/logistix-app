import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
  TextInput,
} from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { APP_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';
import { fetchCustomerQuoteBySession } from '@/services/inquiries';
import {
  uploadCustomerInquiryAttachment,
  type LocalAttachment,
} from '@/services/inquiries/attachments';
import { upsertCustomerShipmentInfo } from '@/services/orders';

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('shipment_info_required')) {
    return 'Please provide a tracking number or upload a parcel photo before submitting.';
  }
  if (message.includes('waiting_for_sales')) {
    return 'Please wait for Logistix Sales to respond to your negotiation request.';
  }
  if (message.includes('order_schema_missing') || message.includes('quote_schema_missing')) {
    return 'Shipment features are not configured yet. Run migration 038 in Supabase.';
  }
  return message || 'Unable to save shipment information.';
}

export default function InquiryShipmentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { sessionToken } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const inquiryId = Array.isArray(id) ? id[0] : id;

  const [trackingNumber, setTrackingNumber] = useState('');
  const [photo, setPhoto] = useState<LocalAttachment | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['customer-quote', sessionToken, inquiryId],
    enabled: Boolean(sessionToken && inquiryId),
    queryFn: async () => {
      const result = await fetchCustomerQuoteBySession(sessionToken!, inquiryId!);
      if (result.error || !result.data) {
        throw result.error || new Error('quote_not_available');
      }
      return result.data;
    },
  });

  const alreadyAccepted = Boolean(data?.customerAcceptedAt || data?.status === 'accepted');

  const invalidate = async (quotationId?: string) => {
    await queryClient.invalidateQueries({
      queryKey: ['customer-quote', sessionToken, inquiryId],
    });
    await queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    await queryClient.invalidateQueries({ queryKey: ['customer-portal'] });
    if (quotationId) {
      await queryClient.invalidateQueries({
        queryKey: ['customer-order', sessionToken, quotationId],
      });
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to upload a parcel photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPhoto({
      id: `parcel-${Date.now()}`,
      uri: asset.uri,
      name: asset.fileName || `parcel_${Date.now()}.jpg`,
      mimeType: asset.mimeType || 'image/jpeg',
      size: asset.fileSize,
      kind: 'image',
    });
  };

  const submitMutation = useMutation({
    mutationFn: async (mode: 'with_info' | 'accept_only') => {
      if (mode === 'accept_only') {
        const result = await upsertCustomerShipmentInfo(sessionToken!, inquiryId!, {
          acceptWithoutShipment: true,
        });
        if (result.error) throw result.error;
        return result.data;
      }

      const tracking = trackingNumber.trim();
      let photoUrl: string | null = null;
      let photoPath: string | null = null;

      if (photo) {
        const uploaded = await uploadCustomerInquiryAttachment(photo);
        if (uploaded.error || !uploaded.data) {
          throw uploaded.error || new Error('Parcel photo upload failed.');
        }
        photoUrl = uploaded.data.url;
        try {
          const pathPart = uploaded.data.url.split('/inquiry-images/')[1];
          photoPath = pathPart ? decodeURIComponent(pathPart) : null;
        } catch {
          photoPath = null;
        }
      }

      if (!tracking && !photoUrl) {
        throw new Error('shipment_info_required');
      }

      const result = await upsertCustomerShipmentInfo(sessionToken!, inquiryId!, {
        trackingNumber: tracking || null,
        parcelPhotoUrl: photoUrl,
        parcelPhotoPath: photoPath,
      });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: async (payload) => {
      const quotationId = payload?.quotation_id
        ? String(payload.quotation_id)
        : data?.quotationId;
      await invalidate(quotationId);
      router.replace(APP_ROUTES.orders as Href);
      Alert.alert(
        alreadyAccepted ? 'Information saved' : 'Quotation accepted',
        alreadyAccepted
          ? 'Your shipment information was updated. Sales has been notified.'
          : 'Your quotation was accepted and Sales has been notified.',
      );
    },
    onError: (err) => {
      Alert.alert('Unable to submit', getErrorMessage(err));
    },
  });

  if (isLoading && !data) {
    return (
      <ScreenContainer title="Shipment info" subtitle="Loading…">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (isError || !data) {
    return (
      <ScreenContainer title="Shipment info" subtitle="Unavailable">
        <EmptyState
          icon="cube-outline"
          title="Unable to load quotation"
          description={getErrorMessage(error)}
          actionLabel="Back"
          onActionPress={() => router.back()}
        />
      </ScreenContainer>
    );
  }

  if (!data.canAccept && !alreadyAccepted) {
    return (
      <ScreenContainer title="Shipment info" subtitle={data.quotationNumber}>
        <EmptyState
          icon="lock-closed-outline"
          title="Acceptance unavailable"
          description="This quotation cannot be accepted right now."
          actionLabel="Back to quotation"
          onActionPress={() =>
            router.replace(APP_ROUTES.inquiryQuote(inquiryId || '') as Href)
          }
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title={alreadyAccepted ? 'Add tracking info' : 'Accept quotation'}
      subtitle={data.quotationNumber || 'Shipment information'}
      headerRight={
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backLink}>Back</Text>
        </Pressable>
      }
    >
      <FadeIn>
        <Card>
          <Text style={styles.lead}>
            {alreadyAccepted
              ? 'Add a tracking number, parcel photo, or both. At least one is required to submit.'
              : 'Optionally add tracking information now, or accept without it and add details later from Orders.'}
          </Text>
        </Card>
      </FadeIn>

      <FadeIn delay={40}>
        <SectionHeader title="Tracking Number" />
        <TextInput
          label="Tracking number (optional)"
          value={trackingNumber}
          onChangeText={setTrackingNumber}
          placeholder="e.g. TRK-123456"
          autoCapitalize="characters"
        />
      </FadeIn>

      <FadeIn delay={80}>
        <SectionHeader title="Parcel Photo" />
        <Card>
          {photo ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photo.uri }} style={styles.photo} />
              <Text style={styles.photoName} numberOfLines={1}>
                {photo.name}
              </Text>
              <Button label="Remove photo" variant="ghost" onPress={() => setPhoto(null)} />
            </View>
          ) : data.shipmentParcelPhotoUrl ? (
            <View style={styles.photoPreview}>
              <Image
                source={{ uri: data.shipmentParcelPhotoUrl }}
                style={styles.photo}
              />
              <Text style={styles.photoHint}>Current uploaded photo</Text>
            </View>
          ) : (
            <Text style={styles.photoHint}>Optional — upload a clear photo of the parcel.</Text>
          )}
          <Button
            label={photo ? 'Replace photo' : 'Upload Photo'}
            variant="outline"
            fullWidth
            onPress={() => void pickPhoto()}
          />
        </Card>
      </FadeIn>

      <View style={styles.actions}>
        <Button
          label="Submit"
          fullWidth
          size="lg"
          loading={submitMutation.isPending}
          onPress={() => submitMutation.mutate('with_info')}
        />
        {!alreadyAccepted ? (
          <Button
            label="Accept without shipment information"
            variant="outline"
            fullWidth
            loading={submitMutation.isPending}
            onPress={() => submitMutation.mutate('accept_only')}
          />
        ) : null}
        <Button label="Cancel" variant="ghost" fullWidth onPress={() => router.back()} />
      </View>
    </ScreenContainer>
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
  lead: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  photoPreview: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  photoName: {
    ...typography.caption,
    color: colors.text,
  },
  photoHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.huge,
  },
});
