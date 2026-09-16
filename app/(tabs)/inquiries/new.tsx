import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ErrorBanner } from '@/components/auth';
import { Button, FadeIn, ProgressBar, ScreenContainer, TextInput } from '@/components/ui';
import { INQUIRY_WIZARD_STEPS } from '@/constants/inquiry-form';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import { queryClient } from '@/lib/query-client';
import { APP_ROUTES, AUTH_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import {
  MAX_CUSTOMER_ATTACHMENTS,
  isImageAttachment,
  saveCustomerInquiryDraft,
  splitUploadedAttachments,
  submitCustomerInquiry,
  submitCustomerInquiryDraft,
  uploadCustomerInquiryAttachments,
  type LocalAttachment,
} from '@/services/inquiries';
import { isDraftInquiry } from '@/utils/home-dashboard';
import { attachmentsFromInquiry } from '@/utils/inquiry-media';

const STEPS = INQUIRY_WIZARD_STEPS;

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

const WHOLE_NUMBER = /^\d+$/;
const DECIMAL_NUMBER = /^(?:\d+|\d+\.\d+|\d*\.\d+)$/;

function sanitizeWholeNumber(value: string) {
  return value.replace(/[^\d]/g, '');
}

function sanitizeDecimal(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot < 0) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

function isProductComplete(form: FormState) {
  return Boolean(form.productName.trim()) && WHOLE_NUMBER.test(form.quantity.trim());
}

function isCargoComplete(form: FormState) {
  return (
    DECIMAL_NUMBER.test(form.totalWeight.trim()) && DECIMAL_NUMBER.test(form.cbm.trim())
  );
}

/** Progressive wizard index: Product → Cargo → Notes → Review based on completed fields. */
function computeActiveStep(form: FormState): number {
  if (!isProductComplete(form)) return 0;
  if (!isCargoComplete(form)) return 1;
  // Notes is optional — once cargo is done, Notes is complete and Review becomes active.
  return 3;
}

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
  if (lower.includes('draft_not_found')) {
    return 'This draft is no longer available. Start a new request or pick another draft.';
  }
  if (lower.includes('draft_schema_missing')) {
    return 'Drafts are not configured on the server yet. Run migration 033 in Supabase.';
  }
  if (lower.includes('upload_policy_missing') || lower.includes('submit_schema_missing')) {
    return 'Attachments are not configured on the server yet. Run migration 018 in Supabase.';
  }
  return message || 'Unable to submit request. Please try again.';
}

function makeAttachmentId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function attachmentsToPayload(uploaded: { url: string; name: string; kind: 'image' | 'file' }[]) {
  const { imageUrl, additionalImageUrls } = splitUploadedAttachments(uploaded);
  return {
    imageUrl,
    additionalImageUrls,
    draftAttachments: uploaded.map((item) => ({
      url: item.url,
      name: item.name,
      kind: item.kind,
    })),
  };
}

export default function NewRequestScreen() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const params = useLocalSearchParams<{ draftId?: string; mode?: string; t?: string }>();
  const paramDraftId = Array.isArray(params.draftId) ? params.draftId[0] : params.draftId;
  const paramMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const freshKey = Array.isArray(params.t) ? params.t[0] : params.t;
  const selectedDraftId = paramDraftId?.trim() || '';
  const mode: 'new' | 'edit_draft' =
    paramMode === 'edit' && selectedDraftId ? 'edit_draft' : 'new';
  const { data: portalData } = useCustomerPortal(sessionToken);

  const [draftId, setDraftId] = useState<string | null>(mode === 'edit_draft' ? selectedDraftId : null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [hydratedDraftId, setHydratedDraftId] = useState<string | null>(null);
  const skipAutosaveRef = useRef(true);
  const draftIdRef = useRef<string | null>(draftId);
  const persistInFlightRef = useRef(false);
  const [success, setSuccess] = useState<{
    inquiryId: string;
    inquiryNumber: string;
    message: string;
  } | null>(null);

  draftIdRef.current = draftId;

  const step = useMemo(() => computeActiveStep(form), [form]);
  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);
  const remainingSlots = MAX_CUSTOMER_ATTACHMENTS - attachments.length;
  const busy = submitting || savingDraft;

  const resetToNewRequest = () => {
    skipAutosaveRef.current = true;
    draftIdRef.current = null;
    setDraftId(null);
    setForm(EMPTY);
    setAttachments([]);
    setErrors({});
    setFormError(null);
    setHydratedDraftId(null);
    setSubmitting(false);
    setSavingDraft(false);
    setSuccess(null);
  };

  useEffect(() => {
    if (mode !== 'new') return;
    resetToNewRequest();
  }, [mode, selectedDraftId, freshKey]);

  useEffect(() => {
    if (mode !== 'edit_draft' || !selectedDraftId) return;
    if (hydratedDraftId === selectedDraftId) return;
    const draft = portalData?.inquiries.find(
      (row) => row.id === selectedDraftId && isDraftInquiry(row),
    );
    if (!draft) return;

    skipAutosaveRef.current = true;
    draftIdRef.current = draft.id;
    setDraftId(draft.id);
    setForm({
      productName: draft.productName ?? '',
      quantity: draft.quantity ?? '',
      totalWeight: draft.totalWeight ?? '',
      cbm: draft.cbm ?? '',
      notes: draft.description ?? '',
    });
    setAttachments(
      attachmentsFromInquiry(draft).map((item) => ({
        id: makeAttachmentId(),
        uri: item.url,
        name: item.name,
        mimeType: item.kind === 'image' ? 'image/jpeg' : 'application/octet-stream',
        kind: item.kind,
        remoteUrl: item.url,
      })),
    );
    setErrors({});
    setFormError(null);
    setSuccess(null);
    setHydratedDraftId(draft.id);
  }, [mode, selectedDraftId, portalData?.inquiries, hydratedDraftId]);

  const persistDraft = async (saveKind: 'explicit' | 'auto') => {
    if (!sessionToken) {
      return { ok: false as const, error: 'Your session expired. Please sign in again.' };
    }

    const uploadResult = await uploadCustomerInquiryAttachments(attachments);
    if (uploadResult.error || !uploadResult.data) {
      return {
        ok: false as const,
        error: getSubmitErrorMessage(uploadResult.error),
      };
    }

    const uploaded = uploadResult.data;
    const payload = attachmentsToPayload(uploaded);
    const result = await saveCustomerInquiryDraft({
      sessionToken,
      inquiryId: mode === 'edit_draft' ? selectedDraftId || draftIdRef.current : null,
      productName: form.productName,
      quantity: form.quantity,
      totalWeight: form.totalWeight,
      cbm: form.cbm,
      description: form.notes,
      imageUrl: payload.imageUrl,
      additionalImageUrls: payload.additionalImageUrls,
      draftStep: step,
      draftAttachments: payload.draftAttachments,
    });

    if (result.error || !result.data) {
      return { ok: false as const, error: getSubmitErrorMessage(result.error) };
    }

    setDraftId(result.data.inquiryId);
    draftIdRef.current = result.data.inquiryId;
    setAttachments((prev) =>
      prev.map((item, index) => ({
        ...item,
        remoteUrl: uploaded[index]?.url ?? item.remoteUrl,
        uri: uploaded[index]?.url ?? item.uri,
      })),
    );
    if (saveKind === 'explicit') {
      await queryClient.invalidateQueries({ queryKey: ['customer-portal'] });
      await queryClient.refetchQueries({ queryKey: ['customer-portal'] });
    }
    return { ok: true as const, message: result.data.message, mode: saveKind };
  };

  const persistDraftGuarded = async (saveKind: 'explicit' | 'auto') => {
    if (saveKind === 'auto' && persistInFlightRef.current) {
      return { ok: true as const, message: '', mode: saveKind };
    }
    persistInFlightRef.current = true;
    try {
      return await persistDraft(saveKind);
    } finally {
      persistInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (mode !== 'edit_draft' || !draftId || submitting || savingDraft || success) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void persistDraftGuarded('auto').then((result) => {
        if (!result.ok) setFormError(result.error);
      });
    }, 2500);
    return () => clearTimeout(timer);
    // Autosave the same draft when the customer pauses after edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, step, attachments, draftId]);

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
          kind: isImageAttachment({ kind: 'file', mimeType, name })
            ? ('image' as const)
            : ('file' as const),
        };
      }),
    );
  };

  const validateForm = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.productName.trim()) next.productName = 'Product name is required';
    if (!form.quantity.trim()) next.quantity = 'Quantity is required';
    else if (!WHOLE_NUMBER.test(form.quantity.trim())) {
      next.quantity = 'Quantity must be a whole number';
    }
    if (!form.totalWeight.trim()) next.totalWeight = 'Weight is required';
    else if (!DECIMAL_NUMBER.test(form.totalWeight.trim())) {
      next.totalWeight = 'Enter a valid number (e.g. 12.5)';
    }
    if (!form.cbm.trim()) next.cbm = 'CBM is required';
    else if (!DECIMAL_NUMBER.test(form.cbm.trim())) {
      next.cbm = 'Enter a valid number (e.g. 12.5)';
    }
    // Other details (notes) is intentionally optional — never required.
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    setFormError(null);
    const result = await persistDraftGuarded('explicit');
    setSavingDraft(false);

    if (!result.ok) {
      setFormError(result.error);
      if (result.error.toLowerCase().includes('session expired')) {
        Alert.alert('Session expired', result.error, [
          { text: 'Sign in', onPress: () => router.replace(AUTH_ROUTES.login as Href) },
        ]);
      }
      return;
    }

    resetToNewRequest();
    router.replace(APP_ROUTES.inquiryDrafts as Href);
  };

  const submit = async () => {
    if (!validateForm()) return;

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
    const currentDraftId = draftIdRef.current;

    const result = currentDraftId
      ? await submitCustomerInquiryDraft({
          sessionToken,
          inquiryId: currentDraftId,
          productName: form.productName,
          quantity: form.quantity,
          totalWeight: form.totalWeight,
          cbm: form.cbm,
          description: form.notes,
          imageUrl,
          additionalImageUrls,
        })
      : await submitCustomerInquiry({
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

  if (mode === 'edit_draft' && hydratedDraftId !== selectedDraftId) {
    const missing =
      Boolean(portalData) &&
      !portalData?.inquiries.some((row) => row.id === selectedDraftId && isDraftInquiry(row));

    return (
      <ScreenContainer title="Continue draft" subtitle={missing ? 'Not found' : 'Loading…'}>
        {missing ? (
          <View style={styles.form}>
            <ErrorBanner message="This draft is no longer available." />
            <Button
              label="Back to Draft Requests"
              fullWidth
              onPress={() => router.replace(APP_ROUTES.inquiryDrafts as Href)}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.reviewHint}>Loading your saved request…</Text>
          </View>
        )}
      </ScreenContainer>
    );
  }

  const productDone = isProductComplete(form);
  const cargoDone = isCargoComplete(form);
  // Optional notes: treated as complete once cargo is filled so progress can reach Review.
  const notesDone = cargoDone;
  const reviewDone = productDone && cargoDone;

  return (
    <ScreenContainer
      title={mode === 'edit_draft' ? 'Continue draft' : 'New request'}
      subtitle={`${STEPS[step]} · ${step + 1} of ${STEPS.length}`}
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
          const sectionDone =
            (index === 0 && productDone) ||
            (index === 1 && cargoDone) ||
            (index === 2 && notesDone) ||
            (index === 3 && reviewDone);
          const active = index === step;
          const done = sectionDone && !active;
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
                  {done ? '✓' : index + 1}
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

      <FadeIn>
        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product</Text>
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
              onChangeText={(v) => update('quantity', sanitizeWholeNumber(v))}
              error={errors.quantity}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cargo</Text>
            <TextInput
              label="Total weight (kg)"
              placeholder="e.g. 2400 or 12.5"
              keyboardType="decimal-pad"
              value={form.totalWeight}
              onChangeText={(v) => update('totalWeight', sanitizeDecimal(v))}
              error={errors.totalWeight}
            />
            <TextInput
              label="Total CBM"
              placeholder="e.g. 12.5"
              keyboardType="decimal-pad"
              value={form.cbm}
              onChangeText={(v) => update('cbm', sanitizeDecimal(v))}
              error={errors.cbm}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              label="Other details (optional)"
              placeholder="Packaging notes, HS hints, special handling…"
              value={form.notes}
              onChangeText={(v) => update('notes', v)}
              multiline
              hint="You can leave this blank and still submit."
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Review</Text>

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
                  disabled={remainingSlots <= 0 || busy}
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
                  disabled={remainingSlots <= 0 || busy}
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

            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>Inquiry summary</Text>
              <ReviewRow label="Product name" value={form.productName || '—'} />
              <ReviewRow label="Quantity" value={form.quantity || '—'} />
              <ReviewRow label="Total weight (kg)" value={form.totalWeight || '—'} />
              <ReviewRow label="Total CBM" value={form.cbm || '—'} />
              <ReviewRow label="Other details" value={form.notes.trim() || '—'} />

              <View style={[styles.reviewRow, styles.reviewBorder]}>
                <Text style={styles.reviewLabel}>Attachments</Text>
                <View style={styles.reviewAttachValue}>
                  {attachments.length === 0 ? (
                    <Text style={styles.reviewValue}>None</Text>
                  ) : (
                    attachments.map((item) => (
                      <View key={item.id} style={styles.reviewAttachItem}>
                        {item.kind === 'image' ? (
                          <Image source={{ uri: item.uri }} style={styles.reviewAttachThumb} />
                        ) : (
                          <View style={styles.reviewAttachFile}>
                            <Ionicons name="document-outline" size={16} color={colors.textMuted} />
                          </View>
                        )}
                        <Text style={styles.reviewAttachName} numberOfLines={2}>
                          {item.name}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>

              <Text style={styles.reviewHint}>
                This uses the same cargo fields as CRM Sales inquiries. Your sales agent will
                review and forward to Operations.
              </Text>
            </View>
          </View>
        </View>
      </FadeIn>

      <View style={styles.actions}>
        <Button
          label="Submit request"
          fullWidth
          size="lg"
          loading={submitting}
          disabled={busy && !submitting}
          onPress={() => void submit()}
        />
        <Button
          label="Save as Draft"
          variant="outline"
          fullWidth
          loading={savingDraft}
          disabled={busy && !savingDraft}
          onPress={() => void saveDraft()}
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
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontSize: 17,
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
  reviewAttachValue: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  reviewAttachItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewAttachThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  reviewAttachFile: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAttachName: {
    ...typography.bodySmall,
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
