import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo, BenefitItem } from '@/components/auth';
import { Button, FadeIn } from '@/components/ui';
import { APP_NAME } from '@/constants';
import { AUTH_ROUTES } from '@/navigation/routes';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';

const STEPS = [
  {
    n: '1',
    title: 'Share cargo details',
    body: 'Submit product, weight, and CBM — or let your sales agent open a request for you.',
  },
  {
    n: '2',
    title: 'Review status & quotes',
    body: 'See clear next steps when Logistix reviews your request or sends a quote.',
  },
  {
    n: '3',
    title: 'Follow warehouse milestones',
    body: 'Track receive, dispatch, and delivery updates without chasing WhatsApp threads.',
  },
];

const SERVICES = [
  { icon: 'boat-outline' as const, title: 'Freight requests', body: 'Transparent inquiry status' },
  { icon: 'document-text-outline' as const, title: 'Quotes & docs', body: 'Quotes and packing files' },
  { icon: 'navigate-outline' as const, title: 'Shipment tracking', body: 'Warehouse milestones' },
];

export function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppLogo size="sm" />
          <View style={styles.headerActions}>
            <Button
              label="Login"
              variant="ghost"
              size="sm"
              onPress={() => router.push(AUTH_ROUTES.login)}
            />
            <Button label="Signup" size="sm" onPress={() => router.push(AUTH_ROUTES.signup)} />
          </View>
        </View>

        <FadeIn>
          <View style={styles.hero}>
            <Text style={styles.brandMark}>{APP_NAME}</Text>
            <Text style={styles.heroTitle}>Your freight companion</Text>
            <Text style={styles.heroSubtitle}>
              See every request status, next step, and warehouse milestone — without calling for
              updates.
            </Text>
          </View>
          <View style={styles.heroCta}>
            <Button
              label="Get started"
              fullWidth
              size="lg"
              onPress={() => router.push(AUTH_ROUTES.signup)}
            />
            <Button
              label="I already have an account"
              variant="outline"
              fullWidth
              onPress={() => router.push(AUTH_ROUTES.login)}
            />
          </View>
        </FadeIn>

        <FadeIn delay={80}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <View style={styles.steps}>
            {STEPS.map((step) => (
              <View key={step.n} style={styles.stepCard}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{step.n}</Text>
                </View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepText}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </FadeIn>

        <FadeIn delay={140}>
          <Text style={styles.sectionTitle}>Why {APP_NAME}?</Text>
          <View style={styles.benefits}>
            <BenefitItem
              icon="eye-outline"
              title="Status you can trust"
              description="Plain-language explanations and a clear next step on every request."
            />
            <BenefitItem
              icon="time-outline"
              title="Fewer follow-ups"
              description="Quotes, documents, and warehouse updates in one place."
            />
            <BenefitItem
              icon="shield-checkmark-outline"
              title="Secure phone login"
              description="Your account is linked by phone to your Customer ID."
            />
          </View>
        </FadeIn>

        <FadeIn delay={200}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.services}>
            {SERVICES.map((s) => (
              <View key={s.title} style={styles.serviceCard}>
                <View style={styles.serviceIcon}>
                  <Ionicons name={s.icon} size={20} color={colors.accent} />
                </View>
                <Text style={styles.serviceTitle}>{s.title}</Text>
                <Text style={styles.serviceBody}>{s.body}</Text>
              </View>
            ))}
          </View>
        </FadeIn>

        <FadeIn delay={260}>
          <View style={styles.bottomCta}>
            <Text style={styles.bottomTitle}>Ready to ship with clarity?</Text>
            <Text style={styles.bottomBody}>
              Create your account with your business phone number and start tracking requests.
            </Text>
            <Button
              label="Create account"
              fullWidth
              size="lg"
              onPress={() => router.push(AUTH_ROUTES.signup)}
            />
          </View>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hero: {
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    ...shadows.md,
  },
  brandMark: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    ...typography.h1,
    color: colors.surface,
  },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 24,
  },
  heroCta: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  steps: {
    gap: spacing.md,
  },
  stepCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepNum: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    ...typography.label,
    color: colors.accentDark,
    fontWeight: '800',
  },
  stepBody: {
    flex: 1,
    gap: spacing.xs,
  },
  stepTitle: {
    ...typography.label,
    fontSize: 15,
    color: colors.text,
  },
  stepText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  benefits: {
    gap: spacing.lg,
  },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  serviceCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitle: {
    ...typography.label,
    color: colors.text,
  },
  serviceBody: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  bottomCta: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  bottomTitle: {
    ...typography.h3,
    color: colors.text,
  },
  bottomBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
