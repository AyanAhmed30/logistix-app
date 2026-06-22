import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BenefitItem, PlaceholderLogo } from '@/components/auth';
import { Button } from '@/components/ui';
import { APP_NAME } from '@/constants';
import { AUTH_ROUTES } from '@/navigation/routes';
import { colors, radius, spacing, typography } from '@/constants/theme';

export function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <PlaceholderLogo size="sm" />
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

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Ship smarter with {APP_NAME}</Text>
          <Text style={styles.heroSubtitle}>
            Your trusted logistics partner for fast, reliable, and transparent deliveries across
            every mile.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About our company</Text>
          <Text style={styles.sectionBody}>
            {APP_NAME} connects customers with a modern logistics network built for speed,
            visibility, and trust. We simplify how you send, track, and receive shipments.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About this app</Text>
          <Text style={styles.sectionBody}>
            Manage your logistics journey from one place — register securely, access your profile,
            and stay ready for upcoming shipment features.
          </Text>
        </View>

        <View style={styles.benefits}>
          <Text style={styles.sectionTitle}>Why use {APP_NAME}?</Text>
          <BenefitItem
            icon="shield-checkmark-outline"
            title="Secure account access"
            description="Phone verification and protected login keep your account safe."
          />
          <BenefitItem
            icon="time-outline"
            title="Real-time readiness"
            description="Built for upcoming live tracking and delivery updates."
          />
          <BenefitItem
            icon="headset-outline"
            title="Customer-first support"
            description="Designed for a smooth, professional logistics experience."
          />
        </View>

        <View style={styles.ctaRow}>
          <Button
            label="Create Account"
            fullWidth
            size="lg"
            onPress={() => router.push(AUTH_ROUTES.signup)}
          />
          <Button
            label="I already have an account"
            variant="outline"
            fullWidth
            size="lg"
            onPress={() => router.push(AUTH_ROUTES.login)}
          />
        </View>
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
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
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
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.text,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  sectionBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  benefits: {
    gap: spacing.lg,
  },
  ctaRow: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
