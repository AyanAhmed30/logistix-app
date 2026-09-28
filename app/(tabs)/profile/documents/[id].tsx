import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';
import { EmptyState, FadeIn, ScreenContainer } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers';
import { loadDocumentRecord } from '@/services/documents/customer-documents';
import {
  buildDemoDocumentsForId,
  type CustomerDocumentItem,
  type CustomerDocumentKind,
} from '@/utils/customer-documents';

function kindIcon(kind: CustomerDocumentKind): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case 'quotation':
      return 'document-text-outline';
    case 'parcel_photo':
    case 'cargo_photo':
      return 'image-outline';
    case 'tracking':
      return 'navigate-outline';
    default:
      return 'attach-outline';
  }
}

export default function DocumentRecordScreen() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const params = useLocalSearchParams<{ id?: string; source?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const sourceParam = Array.isArray(params.source) ? params.source[0] : params.source;
  const source = sourceParam === 'order' ? 'order' : 'inquiry';
  const [previewItem, setPreviewItem] = useState<CustomerDocumentItem | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customer-document-record', sessionToken, id, source],
    enabled: Boolean(sessionToken && id),
    queryFn: async () => {
      const result = await loadDocumentRecord(sessionToken!, id!, source);
      if (result.error && !result.data) throw result.error;
      return result.data;
    },
  });

  const demo = id && !data && !isLoading && !isError ? buildDemoDocumentsForId(id) : null;
  const record = data ?? (demo
    ? {
        title: demo.title,
        reference: demo.reference,
        statusLabel: demo.statusLabel,
        recordHref: null,
        documents: demo.documents,
      }
    : null);

  const openDocument = (item: CustomerDocumentItem) => {
    if (item.kind === 'tracking' && item.value) {
      setPreviewItem(item);
      return;
    }

    if (item.url) {
      setPreviewItem(item);
      return;
    }

    if (item.href) {
      router.push(item.href as Href);
      return;
    }

    Alert.alert(item.title, item.description || 'This document is not available yet.');
  };

  return (
    <ScreenContainer
      title={record?.title || 'Documents'}
      subtitle={
        record
          ? [record.reference, record.statusLabel].filter(Boolean).join(' · ')
          : 'Related files'
      }
      headerRight={
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
      }
    >
      {!id ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Missing record"
          description="Go back and select a request or order."
          actionLabel="Back"
          onActionPress={() => router.back()}
        />
      ) : isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading documents…</Text>
        </View>
      ) : isError && !record ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Unable to load documents"
          description={
            error instanceof Error && error.message === 'record_not_found'
              ? 'This request or order was not found.'
              : error instanceof Error
                ? error.message
                : 'Please try again.'
          }
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      ) : !record ? (
        <EmptyState
          icon="folder-open-outline"
          title="Record not found"
          description="Go back and select another request or order."
          actionLabel="Back"
          onActionPress={() => router.back()}
        />
      ) : (
        <View style={styles.content}>
          {record.recordHref ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(record.recordHref as Href)}
              style={({ pressed }) => [styles.openRecord, pressed && styles.pressed]}
            >
              <Text style={styles.openRecordText}>Open full request / order</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.accent} />
            </Pressable>
          ) : null}

          <Text style={styles.sectionTitle}>Documents</Text>

          {record.documents.length === 0 ? (
            <EmptyState
              icon="document-outline"
              title="No documents yet"
              description="Quotation PDF, tracking number, parcel photo, and attachments will appear here when available."
            />
          ) : (
            <View style={styles.list}>
              {record.documents.map((item, index) => (
                <FadeIn key={item.id} delay={index * 35}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openDocument(item)}
                    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                  >
                    <View style={styles.iconWrap}>
                      <Ionicons name={kindIcon(item.kind)} size={22} color={colors.primary} />
                    </View>
                    <View style={styles.body}>
                      <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeText}>{item.typeLabel}</Text>
                        </View>
                      </View>
                      {item.value ? (
                        <Text style={styles.value} selectable>
                          {item.value}
                        </Text>
                      ) : null}
                      {item.description ? (
                        <Text style={styles.description} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                      {item.meta ? <Text style={styles.meta}>{item.meta}</Text> : null}
                      <View style={styles.footer}>
                        <Text style={styles.action}>
                          {item.url || item.kind === 'tracking' ? 'Open' : 'View'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                      </View>
                    </View>
                  </Pressable>
                </FadeIn>
              ))}
            </View>
          )}
        </View>
      )}

      <DocumentPreviewModal
        item={previewItem}
        visible={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: {
    ...typography.label,
    color: colors.accent,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  content: {
    gap: spacing.md,
  },
  openRecord: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  openRecordText: {
    ...typography.label,
    color: colors.accent,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    ...typography.label,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  typeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  value: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.xs,
  },
  action: {
    ...typography.label,
    color: colors.accent,
  },
});
