import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { CustomerInquiry } from '@/types/inquiry';
import {
  getInquiryDocumentUrls,
  getInquiryImageUrls,
} from '@/utils/inquiry-media';

const CARD_IMAGE_HEIGHT = 320;

type InquiryImageGalleryProps = {
  imageUrls: string[];
};

export function InquiryImageGallery({ imageUrls }: InquiryImageGalleryProps) {
  if (imageUrls.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        Product images{imageUrls.length > 1 ? ` (${imageUrls.length})` : ''}
      </Text>
      <View style={styles.stack}>
        {imageUrls.map((url, index) => (
          <InquiryImageCard key={`${url}-${index}`} url={url} index={index} total={imageUrls.length} />
        ))}
      </View>
    </View>
  );
}

type InquiryImageCardProps = {
  url: string;
  index: number;
  total: number;
};

function InquiryImageCard({ url, index, total }: InquiryImageCardProps) {
  const [failed, setFailed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Product image ${index + 1} of ${total}. Tap to open full size.`}
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => [styles.imageCard, pressed ? styles.pressed : null]}
    >
      {total > 1 ? (
        <View style={styles.imageBadge}>
          <Text style={styles.imageBadgeText}>
            {index + 1} / {total}
          </Text>
        </View>
      ) : null}
      {failed ? (
        <View style={styles.fallback}>
          <Ionicons name="image-outline" size={32} color={colors.textMuted} />
          <Text style={styles.fallbackText}>Unable to preview image</Text>
          <Text style={styles.fallbackLink}>Tap to open</Text>
        </View>
      ) : (
        <Image
          source={{ uri: url }}
          style={styles.image}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      )}
    </Pressable>
  );
}

type InquiryAttachmentsProps = {
  documentUrls: string[];
  linkUrl: string | null;
};

export function InquiryAttachments({ documentUrls, linkUrl }: InquiryAttachmentsProps) {
  const hasDocuments = documentUrls.length > 0;
  const hasLink = Boolean(linkUrl?.trim());

  if (!hasDocuments && !hasLink) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Attachments</Text>
      <View style={styles.attachments}>
        {hasLink ? (
          <AttachmentRow
            icon="link-outline"
            label="Product link"
            onPress={() => Linking.openURL(linkUrl!.trim())}
          />
        ) : null}
        {documentUrls.map((url) => (
          <AttachmentRow
            key={url}
            icon="document-outline"
            label={fileLabelFromUrl(url)}
            onPress={() => Linking.openURL(url)}
          />
        ))}
      </View>
    </View>
  );
}

type AttachmentRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function AttachmentRow({ icon, label, onPress }: AttachmentRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.attachmentRow, pressed ? styles.pressed : null]}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.attachmentLabel} numberOfLines={2}>
        {label}
      </Text>
      <Ionicons name="open-outline" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

function fileLabelFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segment = pathname.split('/').filter(Boolean).pop();
    return segment || 'Open document';
  } catch {
    return 'Open document';
  }
}

export function useInquiryMedia(
  inquiry: Pick<CustomerInquiry, 'imageUrl' | 'additionalImageUrls' | 'linkUrl'>,
) {
  const imageUrls = getInquiryImageUrls(inquiry);
  const documentUrls = getInquiryDocumentUrls(inquiry);
  return { imageUrls, documentUrls };
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  title: {
    ...typography.label,
    color: colors.text,
  },
  stack: {
    gap: spacing.md,
  },
  imageCard: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
    backgroundColor: colors.overlay,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  imageBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    backgroundColor: colors.surfaceMuted,
  },
  fallbackText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fallbackLink: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  attachments: {
    gap: spacing.sm,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  attachmentLabel: {
    ...typography.bodySmall,
    color: colors.primary,
    flex: 1,
  },
  pressed: {
    opacity: 0.92,
  },
});
