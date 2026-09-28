import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { isLikelyImageUrl } from '@/utils/inquiry-media';
import type { CustomerDocumentItem } from '@/utils/customer-documents';

type Props = {
  item: CustomerDocumentItem | null;
  visible: boolean;
  onClose: () => void;
};

function guessFileName(item: CustomerDocumentItem): string {
  const url = item.url?.trim() || '';
  try {
    const fromUrl = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '');
    if (fromUrl) return fromUrl;
  } catch {
    // ignore
  }
  const safe = item.title.replace(/[^\w.-]+/g, '_').slice(0, 64);
  if (item.kind === 'quotation' || url.toLowerCase().includes('.pdf')) {
    return `${safe || 'document'}.pdf`;
  }
  return safe || 'download';
}

function isPdfItem(item: CustomerDocumentItem): boolean {
  const url = (item.url || '').toLowerCase();
  return (
    item.kind === 'quotation' ||
    url.includes('.pdf') ||
    url.includes('application/pdf')
  );
}

function isImageItem(item: CustomerDocumentItem): boolean {
  if (item.kind === 'parcel_photo' || item.kind === 'cargo_photo') return true;
  if (!item.url) return false;
  return isLikelyImageUrl(item.url);
}

async function downloadFile(url: string, fileName: string): Promise<void> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('download_failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      return;
    } catch {
      // Cross-origin fallback: open in new tab so user can save
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return;
    }
  }

  await Linking.openURL(url);
}

export function DocumentPreviewModal({ item, visible, onClose }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const previewKind = useMemo(() => {
    if (!item) return 'none' as const;
    if (item.kind === 'tracking') return 'tracking' as const;
    if (!item.url) return 'empty' as const;
    if (isImageItem(item)) return 'image' as const;
    if (isPdfItem(item)) return 'pdf' as const;
    return 'file' as const;
  }, [item]);

  // Reset image error when switching documents
  useEffect(() => {
    setImageFailed(false);
  }, [item?.id]);

  if (!item) return null;

  const handleDownload = async () => {
    if (!item.url) {
      Alert.alert('Unavailable', 'This file cannot be downloaded yet.');
      return;
    }
    setDownloading(true);
    try {
      await downloadFile(item.url, guessFileName(item));
    } catch {
      Alert.alert('Download failed', 'Unable to download this file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.shell}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.subtitle}>{item.typeLabel}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close preview"
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.preview}>
          {previewKind === 'image' && item.url && !imageFailed ? (
            <Image
              source={{ uri: item.url }}
              style={styles.image}
              resizeMode="contain"
              onError={() => setImageFailed(true)}
            />
          ) : null}

          {previewKind === 'image' && imageFailed ? (
            <View style={styles.fallback}>
              <Ionicons name="image-outline" size={40} color={colors.textMuted} />
              <Text style={styles.fallbackText}>Unable to preview this image</Text>
            </View>
          ) : null}

          {previewKind === 'pdf' && item.url ? (
            Platform.OS === 'web' ? (
              <View style={styles.pdfWrap}>
                {/* eslint-disable-next-line react/no-unknown-property -- web iframe */}
                <iframe
                  src={item.url}
                  title={item.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 8,
                    backgroundColor: '#fff',
                  }}
                />
              </View>
            ) : (
              <View style={styles.fallback}>
                <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
                <Text style={styles.fallbackText}>PDF preview</Text>
                <Text style={styles.fallbackHint}>
                  Use Download to save the quotation PDF to your device.
                </Text>
              </View>
            )
          ) : null}

          {previewKind === 'tracking' ? (
            <View style={styles.fallback}>
              <Ionicons name="navigate-outline" size={40} color={colors.primary} />
              <Text style={styles.trackingValue} selectable>
                {item.value}
              </Text>
              <Text style={styles.fallbackHint}>Parcel tracking number</Text>
            </View>
          ) : null}

          {previewKind === 'file' || previewKind === 'empty' ? (
            <View style={styles.fallback}>
              <Ionicons name="document-outline" size={40} color={colors.textMuted} />
              <Text style={styles.fallbackText}>
                {item.description || 'Preview is not available for this file.'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          {item.url ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Download file"
              onPress={() => void handleDownload()}
              disabled={downloading}
              style={({ pressed }) => [
                styles.downloadBtn,
                pressed && styles.pressed,
                downloading && styles.downloadDisabled,
              ]}
            >
              {downloading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color={colors.surface} />
                  <Text style={styles.downloadLabel}>Download</Text>
                </>
              )}
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryLabel}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  headerText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  preview: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: '#0F172A08',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pdfWrap: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  fallbackText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fallbackHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
  trackingValue: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  downloadDisabled: {
    opacity: 0.7,
  },
  downloadLabel: {
    ...typography.label,
    color: colors.surface,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryLabel: {
    ...typography.label,
    color: colors.text,
  },
  pressed: {
    opacity: 0.9,
  },
});
