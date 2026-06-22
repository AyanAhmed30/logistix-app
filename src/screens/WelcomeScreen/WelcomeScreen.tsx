import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaceholderLogo } from '@/components/auth';
import { Button } from '@/components/ui';
import { AUTH_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';
import { colors, radius, spacing, typography } from '@/constants/theme';

export function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();

  const firstName = user?.firstName ?? 'there';

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(AUTH_ROUTES.login);
    }
  }, [isLoading, router, user]);

  const handleSignOut = async () => {
    await signOut();
    router.replace(AUTH_ROUTES.home);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <PlaceholderLogo size="md" animated />
        <View style={styles.iconBadge}>
          <Ionicons name="hand-left-outline" size={28} color={colors.primary} />
        </View>

        <Text style={styles.greeting}>Welcome, {firstName}</Text>
        <Text style={styles.message}>
          You&apos;re successfully signed in. Your logistics journey starts here.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button label="Sign Out" variant="outline" fullWidth size="lg" onPress={handleSignOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  footer: {
    paddingTop: spacing.lg,
  },
});
