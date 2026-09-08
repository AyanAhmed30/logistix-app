import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, FadeIn, ScreenContainer, SectionHeader } from '@/components/ui';
import { SUPPORT_FAQ } from '@/constants/support';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAssignedSalesAgent } from '@/hooks/useAssignedSalesAgent';
import { useAuth } from '@/providers';
import {
  formatSalesAgentPhoneDisplay,
  salesAgentTelUrl,
  salesAgentWhatsAppUrl,
} from '@/utils/sales-agent-contact';

export default function SupportScreen() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const { data: agent, isLoading, isError, error, refetch, isRefetching } =
    useAssignedSalesAgent(sessionToken);

  const phoneDisplay = formatSalesAgentPhoneDisplay(agent?.phone);
  const whatsappUrl = salesAgentWhatsAppUrl(agent?.phone);
  const telUrl = salesAgentTelUrl(agent?.phone);
  const hasPhone = Boolean(whatsappUrl && telUrl);

  const openWhatsApp = async () => {
    if (!whatsappUrl) {
      Alert.alert(
        'WhatsApp unavailable',
        'Your Sales Agent does not have a phone number on file yet.',
      );
      return;
    }
    try {
      await Linking.openURL(whatsappUrl);
    } catch {
      Alert.alert('Unable to open WhatsApp', 'Please try again or call your Sales Agent.');
    }
  };

  const openCall = async () => {
    if (!telUrl) {
      Alert.alert(
        'Call unavailable',
        'Your Sales Agent does not have a phone number on file yet.',
      );
      return;
    }
    try {
      await Linking.openURL(telUrl);
    } catch {
      Alert.alert('Unable to start call', 'Please try again later.');
    }
  };

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
        <SectionHeader title="Your Sales Agent" />
        <Card>
          {isLoading || isRefetching ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingText}>Loading your Sales Agent…</Text>
            </View>
          ) : isError ? (
            <View style={styles.agentBlock}>
              <Text style={styles.errorText}>
                {error instanceof Error
                  ? error.message
                  : 'Unable to load your Sales Agent right now.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void refetch()}
                style={styles.retry}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : agent ? (
            <View style={styles.agentBlock}>
              <Text style={styles.agentName}>{agent.name}</Text>
              <Text style={styles.agentPhone}>{phoneDisplay}</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>
              Your Sales Agent will appear here once your account is linked. If you just signed
              up, pull to refresh or try again shortly.
            </Text>
          )}
        </Card>

        <View style={styles.channels}>
          <ChannelButton
            icon="logo-whatsapp"
            label="WhatsApp"
            disabled={!hasPhone}
            onPress={() => void openWhatsApp()}
          />
          <ChannelButton
            icon="call-outline"
            label="Call"
            disabled={!hasPhone}
            onPress={() => void openCall()}
          />
          <ChannelButton icon="mail-outline" label="Email" onPress={() => undefined} />
        </View>
        {agent && !hasPhone ? (
          <Text style={styles.phoneHint}>
            Contact actions will unlock when your Sales Agent’s phone number is available.
          </Text>
        ) : null}
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
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.channel,
        disabled && styles.channelDisabled,
        pressed && !disabled && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.channelIcon, disabled && styles.channelIconDisabled]}>
        <Ionicons
          name={icon}
          size={22}
          color={disabled ? colors.textMuted : colors.accent}
        />
      </View>
      <Text style={[styles.channelLabel, disabled && styles.channelLabelDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    ...typography.label,
    color: colors.accent,
  },
  agentBlock: {
    gap: spacing.xs,
  },
  agentName: {
    ...typography.label,
    color: colors.text,
    fontSize: 16,
  },
  agentPhone: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  retry: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  retryText: {
    ...typography.label,
    color: colors.accent,
  },
  channels: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
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
  channelDisabled: {
    opacity: 0.55,
  },
  channelIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelIconDisabled: {
    backgroundColor: colors.borderLight,
  },
  channelLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  channelLabelDisabled: {
    color: colors.textMuted,
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
