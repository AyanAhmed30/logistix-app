import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, FadeIn, ScreenContainer, SectionHeader } from '@/components/ui';
import { SUPPORT_CONTACT, SUPPORT_FAQ } from '@/constants/support';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function SupportScreen() {
  const router = useRouter();

  return (
    <ScreenContainer
      title="Support"
      subtitle="We’re here to help with your freight requests"
      headerRight={
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
      }
    >
      <FadeIn>
        <SectionHeader title="Contact Logistix" />
        <View style={styles.channels}>
          <ChannelButton
            icon="logo-whatsapp"
            label="WhatsApp"
            onPress={() => Linking.openURL(SUPPORT_CONTACT.whatsapp)}
          />
          <ChannelButton
            icon="call-outline"
            label="Call"
            onPress={() => Linking.openURL(SUPPORT_CONTACT.phoneTel)}
          />
          <ChannelButton
            icon="mail-outline"
            label="Email"
            onPress={() => Linking.openURL(SUPPORT_CONTACT.emailMailto)}
          />
        </View>
        <Text style={styles.phoneHint}>{SUPPORT_CONTACT.phone}</Text>
      </FadeIn>

      <FadeIn delay={80}>
        <SectionHeader title="Common questions" />
        <View style={styles.faqList}>
          {SUPPORT_FAQ.map((faq) => (
            <Card key={faq.id}>
              <Text style={styles.question}>{faq.question}</Text>
              <Text style={styles.answer}>{faq.answer}</Text>
            </Card>
          ))}
        </View>
      </FadeIn>
    </ScreenContainer>
  );
}

function ChannelButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.channel, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.channelIcon}>
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <Text style={styles.channelLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    ...typography.label,
    color: colors.accent,
  },
  channels: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  channel: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  channelIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  phoneHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  faqList: {
    gap: spacing.md,
  },
  question: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  answer: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
