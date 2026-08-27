import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ErrorBanner } from '@/components/auth';
import { Button, FadeIn, ProgressBar, ScreenContainer, TextInput } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import { queryClient } from '@/lib/query-client';
import { APP_ROUTES, AUTH_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';
import {
  MAX_CUSTOMER_ATTACHMENTS,
  isImageAttachment,
  splitUploadedAttachments,
  submitCustomerInquiry,
  uploadCustomerInquiryAttachments,
  type LocalAttachment,
} from '@/services/inquiries';

const STEPS = ['Product', 'Cargo', 'Notes', 'Review'] as const;

type FormState = {
  productName: string;
  quantity: string;
  totalWeight: string;
  cbm: string;
  notes: string;
};

const EMPTY: FormState = {
  productName: '',
  quantity: '',
  totalWeight: '',
  cbm: '',
  notes: '',
};

function getSubmitErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const lower = message.toLowerCase();

  if (lower.includes('invalid_session')) {
    return 'Your session expired. Please sign in again.';
  }
  if (lower.includes('no_matching_contact')) {
    return 'No CRM contact was found for your phone number. Ask your sales agent to add your phone in Contacts, then try again.';
  }
  if (lower.includes('no_sales_owner')) {
    return 'We found your contact, but could not determine which sales agent owns it. In CRM Contacts, open your contact and set Salesperson (or ensure a lead exists for this phone), then try again.';
  }
  if (lower.includes('product_name_required')) {
    return 'Product name is required.';
  }
  if (lower.includes('quantity_invalid')) {
    return 'Quantity must be a whole number.';
  }
  if (lower.includes('total_weight_invalid')) {
    return 'Total weight must be a valid number (e.g. 12.5).';
  }
  if (lower.includes('cbm_invalid')) {
    return 'CBM must be a valid number (e.g. 12.5).';
  }
  if (lower.includes('upload_policy_missing') || lower.includes('submit_schema_missing')) {
    return 'Attachments are not configured on the server yet. Run migration 018 in Supabase.';
  }
  return message || 'Unable to submit request. Please try again.';
}

function makeAttachmentId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function NewRequestScreen() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    inquiryId: string;
    inquiryNumber: string;
    message: string;
  } | null>(null);

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);
  const remainingSlots = MAX_CUSTOMER_ATTACHMENTS - attachments.length;

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError(null);
  };

  const addAttachments = (items: LocalAttachment[]) => {
    if (items.length === 0) return;
    setAttachments((prev) => {
      const next = [...prev, ...items].slice(0, MAX_CUSTOMER_ATTACHMENTS);
      return next;
    });
    setFormError(null);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const pickImages = async () => {
    if (remainingSlots <= 0) {
      setFormError(`You can attach up to ${MAX_CUSTOMER_ATTACHMENTS} files.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError('Photo library permission is required to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remainingSlots,
    });

    if (result.canceled || !result.assets?.length) return;

    addAttachments(
      result.assets.map((asset) => ({
        id: makeAttachmentId(),
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize ?? null,
        kind: 'image' as const,
      })),
    );
  };

  const pickFiles = async () => {
    if (remainingSlots <= 0) {
      setFormError(`You can attach up to ${MAX_CUSTOMER_ATTACHMENTS} files.`);
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: ['image/*', 'application/pdf', 'text/plain'],
    });

    if (result.canceled || !result.assets?.length) return;

    addAttachments(
      result.assets.slice(0, remainingSlots).map((asset) => {
        const name = asset.name || `file_${Date.now()}`;
        const mimeType = asset.mimeType || 'application/octet-stream';
        return {
          id: makeAttachmentId(),
          uri: asset.uri,
          name,
          mimeType,
          size: asset.size ?? null,
          kind: isImageAttachment({ kind: 'file', mimeType, name }) ? ('image' as const) : ('file' as const),
        };
      }),
    );
  };

  const validateStep = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (step === 0) {
      if (!form.productName.trim()) next.productName = 'Product name is required';
      if (!form.quantity.trim()) next.quantity = 'Quantity is required';
      else if (!/^\d+$/.test(form.quantity.trim())) {
        next.quantity = 'Quantity must be a whole number';
      }
    }
    if (step === 1) {
      if (!form.totalWeight.trim()) next.totalWeight = 'Weight is required';
      else if (!/^(?:\d+|\d+\.\d+|\d*\.\d+)$/.test(form.totalWeight.trim())) {
        next.totalWeight = 'Enter a valid number (e.g. 12.5)';
      }
      if (!form.cbm.trim()) next.cbm = 'CBM is required';
      else if (!/^(?:\d+|\d+\.\d+|\d*\.\d+)$/.test(form.cbm.trim())) {
        next.cbm = 'Enter a valid number (e.g. 12.5)';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    void submit();
  };

  const submit = async () => {
    if (!sessionToken) {
      setFormError('Your session expired. Please sign in again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const uploadResult = await uploadCustomerInquiryAttachments(attachments);
    if (uploadResult.error || !uploadResult.data) {
      setSubmitting(false);
      setFormError(getSubmitErrorMessage(uploadResult.error));
      return;
    }

    const { imageUrl, additionalImageUrls } = splitUploadedAttachments(uploadResult.data);

    const result = await submitCustomerInquiry({
      sessionToken,
      productName: form.productName,
      quantity: form.quantity,
      totalWeight: form.totalWeight,
      cbm: form.cbm,
      description: form.notes,
      imageUrl,
      additionalImageUrls,
    });

    setSubmitting(false);

    if (result.error || !result.data) {
      const msg = getSubmitErrorMessage(result.error);
      setFormError(msg);
      if ((result.error?.message ?? '').includes('invalid_session')) {
        Alert.alert('Session expired', msg, [
          { text: 'Sign in', onPress: () => router.replace(AUTH_ROUTES.login as Href) },
        ]);
      }
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['customer-portal'] });

    setSuccess({
      inquiryId: result.data.inquiryId,
      inquiryNumber: result.data.inquiryNumber,
      message: result.data.message,
    });
  };

  if (success) {
    return (
      <ScreenContainer title="Request submitted" subtitle="Sent to your sales agent">
        <FadeIn>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>Thanks — we received your request</Text>
            <Text style={styles.successBody}>
              {success.message} Your sales agent will review the details and send it to Operations
              when ready.
            </Text>
            {success.inquiryNumber ? (
              <Text style={styles.successMeta}>Reference · {success.inquiryNumber}</Text>
            ) : null}
            <Button
              label="View request"
              fullWidth
              onPress={() => router.replace(APP_ROUTES.inquiryDetail(success.inquiryId) as Href)}
            />
            <Button
              label="Back to requests"
              variant="outline"
              fullWidth
              onPress={() => router.replace(APP_ROUTES.inquiries as Href)}
            />
          </View>
        </FadeIn>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="New request"
      subtitle={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
      headerRight={
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      }
    >
      <ProgressBar progress={progress} label="Progress" />

      {formError ? <ErrorBanner message={formError} /> : null}

      <View style={styles.stepRow}>
        {STEPS.map((label, index) => {
          const active = index === step;
          const done = index < step;
          return (
            <View key={label} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  active && styles.stepDotActive,
                  done && styles.stepDotDone,
                ]}
              >
                <Text
                  style={[
                    styles.stepDotText,
                    (active || done) && styles.stepDotTextActive,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <Text
                style={[styles.stepLabel, active && styles.stepLabelActive]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <FadeIn key={step}>
        <View style={styles.form}>
          {step === 0 ? (
            <>
              <TextInput
                label="Product name"
                placeholder="e.g. Ceramic tiles"
                value={form.productName}
                onChangeText={(v) => update('productName', v)}
                error={errors.productName}
              />
              <TextInput
                label="Quantity"
                placeholder="e.g. 120"
                keyboardType="number-pad"
                value={form.quantity}
                onChangeText={(v) => update('quantity', v)}
                error={errors.quantity}
              />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <TextInput
                label="Total weight (kg)"
                placeholder="e.g. 2400"
                keyboardType="decimal-pad"
                value={form.totalWeight}
                onChangeText={(v) => update('totalWeight', v)}
                error={errors.totalWeight}
              />
              <TextInput
                label="Total CBM"
                placeholder="e.g. 12.5"
                keyboardType="decimal-pad"
                value={form.cbm}
                onChangeText={(v) => update('cbm', v)}
                error={errors.cbm}
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <TextInput
                label="Other details (optional)"
                placeholder="Packaging notes, HS hints, special handling…"
                value={form.notes}
                onChangeText={(v) => update('notes', v)}
                multiline
              />

              <View style={styles.attachCard}>
                <Text style={styles.attachTitle}>Attachments (optional)</Text>
                <Text style={styles.attachHint}>
                  Add product photos or files (PDF). Up to {MAX_CUSTOMER_ATTACHMENTS} files, 10 MB
                  each.
                </Text>

                <View style={styles.attachActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void pickImages()}
                    disabled={remainingSlots <= 0 || submitting}
                    style={({ pressed }) => [
                      styles.attachButton,
                      pressed && styles.attachButtonPressed,
                      remainingSlots <= 0 && styles.attachButtonDisabled,
                    ]}
                  >
                    <Ionicons name="image-outline" size={18} color={colors.accent} />
                    <Text style={styles.attachButtonText}>Add photos</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void pickFiles()}
                    disabled={remainingSlots <= 0 || submitting}
                    style={({ pressed }) => [
                      styles.attachButton,
                      pressed && styles.attachButtonPressed,
                      remainingSlots <= 0 && styles.attachButtonDisabled,
                    ]}
                  >
                    <Ionicons name="attach-outline" size={18} color={colors.accent} />
                    <Text style={styles.attachButtonText}>Add files</Text>
                  </Pressable>
                </View>

                {attachments.length > 0 ? (
                  <View style={styles.attachList}>
                    {attachments.map((item) => (
                      <View key={item.id} style={styles.attachRow}>
                        {item.kind === 'image' ? (
                          <Image source={{ uri: item.uri }} style={styles.attachThumb} />
                        ) : (
                          <View style={styles.attachFileIcon}>
                            <Ionicons name="document-outline" size={18} color={colors.textMuted} />
                          </View>
                        )}
                        <Text style={styles.attachName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${item.name}`}
                          onPress={() => removeAttachment(item.id)}
                          hitSlop={10}
                        >
                          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>Review before submit</Text>
              <ReviewRow label="Product name" value={form.productName} />
              <ReviewRow label="Quantity" value={form.quantity} />
              <ReviewRow label="Total weight (kg)" value={form.totalWeight} />
              <ReviewRow label="Total CBM" value={form.cbm} />
              <ReviewRow label="Other details" value={form.notes.trim() || '—'} />
              <ReviewRow
                label="Attachments"
                value={
                  attachments.length === 0
                    ? 'None'
                    : attachments.map((item) => item.name).join(', ')
                }
                last
              />
              <Text style={styles.reviewHint}>
                This uses the same cargo fields as CRM Sales inquiries. Your sales agent will
                review and forward to Operations.
              </Text>
            </View>
          ) : null}
        </View>
      </FadeIn>

      <View style={styles.actions}>
        {step > 0 ? (
          <Button
            label="Back"
            variant="outline"
            fullWidth
            onPress={() => setStep((s) => s - 1)}
            disabled={submitting}
          />
        ) : null}
        <Button
          label={step === STEPS.length - 1 ? 'Submit request' : 'Continue'}
          fullWidth
          size="lg"
          loading={submitting}
          onPress={goNext}
        />
      </View>
    </ScreenContainer>
  );
}

function ReviewRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.reviewRow, !last && styles.reviewBorder]}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cancel: {
    ...typography.label,
    color: colors.accent,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotDone: {
    backgroundColor: colors.accent,
  },
  stepDotText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  stepDotTextActive: {
    color: colors.surface,
  },
  stepLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    width: '100%',
    minHeight: 16,
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  form: {
    gap: spacing.lg,
  },
  attachCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  attachTitle: {
    ...typography.label,
    color: colors.text,
  },
  attachHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  attachActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  attachButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  attachButtonPressed: {
    opacity: 0.85,
  },
  attachButtonDisabled: {
    opacity: 0.5,
  },
  attachButtonText: {
    ...typography.label,
    color: colors.text,
  },
  attachList: {
    gap: spacing.sm,
  },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  attachThumb: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  attachFileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachName: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
    minWidth: 0,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 0,
    ...shadows.sm,
  },
  reviewTitle: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.md,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  reviewBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  reviewLabel: {
    ...typography.caption,
    color: colors.textMuted,
    width: 120,
    flexShrink: 0,
    paddingTop: 2,
  },
  reviewValue: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    minWidth: 0,
  },
  reviewHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    ...shadows.sm,
  },
  successIcon: {
    marginBottom: spacing.sm,
  },
  successTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  successBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  successMeta: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
});
