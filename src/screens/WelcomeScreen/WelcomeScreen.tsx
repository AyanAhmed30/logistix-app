import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/auth';
import { Button, FadeIn } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import { APP_ROUTES, AUTH_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';

const CAPABILITIES = [
  {
    icon: 'document-text-outline' as const,
    title: 'Track requests',
    body: 'See status, next steps, and documents for every freight request.',
  },
  {
    icon: 'cube-outline' as const,
    title: 'Follow shipments',
    body: 'Watch warehouse milestones from receive to dispatch.',
  },
  {
    icon: 'headset-outline' as const,
    title: 'Get support',
    body: 'Reach Logistix when you need a quote clarified or details updated.',
  },
];

export function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(AUTH_ROUTES.login);
    }
  }, [isLoading, router, user]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  const firstName = user.firstName?.trim() || 'there';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.primaryDark, colors.primary, colors.background]}
        locations={[0, 0.4, 0.75]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <FadeIn>
            <AppLogo size="md" />
            <Text style={styles.eyebrow}>Welcome to Logistix</Text>
            <Text style={styles.title}>Good to see you, {firstName}</Text>
            <Text style={styles.subtitle}>
              Your account is ready. Here’s what you can do in the customer app.
            </Text>
          </FadeIn>

          <FadeIn delay={100}>
            <View style={styles.cards}>
              {CAPABILITIES.map((item) => (
                <View key={item.title} style={styles.card}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={item.icon} size={22} color={colors.accent} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardBody}>{item.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </FadeIn>

          <FadeIn delay={180}>
            <Button
              label="Go to Home"
              fullWidth
              size="lg"
              onPress={() => router.replace(APP_ROUTES.home as Href)}
            />
          </FadeIn>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  cards: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.label,
    fontSize: 15,
    color: colors.text,
  },
  cardBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
