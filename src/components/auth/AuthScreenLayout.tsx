import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/auth/AppLogo';
import { AuthLogisticsBackground } from '@/components/auth/AuthLogisticsBackground';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';

type AuthScreenLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  style?: ViewStyle;
  showLogo?: boolean;
};

export function AuthScreenLayout({
  children,
  title,
  subtitle,
  footer,
  style,
  showLogo = true,
}: AuthScreenLayoutProps) {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth, 440);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthLogisticsBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { width: contentWidth }, style]}>
            {showLogo ? (
              <View style={styles.logoWrap}>
                <AppLogo size="md" />
              </View>
            ) : null}

            {(title || subtitle) && (
              <View style={styles.header}>
                {title ? <Text style={styles.title}>{title}</Text> : null}
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
            )}

            <View style={styles.formCard}>{children}</View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1B4F72',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  header: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    maxWidth: 320,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    gap: spacing.lg,
    width: '100%',
    ...shadows.lg,
  },
  footer: {
    marginTop: spacing.xs,
    alignItems: 'center',
  },
});
