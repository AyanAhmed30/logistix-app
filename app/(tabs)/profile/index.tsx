import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, MenuListItem, ScreenContainer } from '@/components/ui';
import { mockCustomer } from '@/data/mock/customer';
import { mockProfileSections } from '@/data/mock/profile';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { APP_ROUTES, AUTH_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';

function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.trim().charAt(0) ?? '';
  const last = lastName?.trim().charAt(0) ?? '';
  return `${first}${last}`.toUpperCase() || 'U';
}

const MENU_ROUTES: Record<string, string> = {
  notifications: APP_ROUTES.notifications,
  support: APP_ROUTES.support,
  security: AUTH_ROUTES.forgotPassword,
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleMenuPress = (id: string) => {
    if (id === 'documents') {
      Alert.alert(
        'Documents',
        'Open any request or order to see quotes, packing lists, and invoices when available.',
      );
      return;
    }
    const route = MENU_ROUTES[id];
    if (route) {
      router.push(route as Href);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace(AUTH_ROUTES.home);
  };

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : `${mockCustomer.firstName} ${mockCustomer.lastName}`;
  const phone = user?.phone ?? mockCustomer.phone;
  const email = user?.email ?? mockCustomer.email;

  return (
    <ScreenContainer title="Profile" subtitle="Your Logistix account" showNotificationBell>
      <View style={styles.profileCard}>
        <Avatar initials={getInitials(user?.firstName, user?.lastName)} size="lg" />
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.role}>{mockCustomer.companyName}</Text>
          <Text style={styles.company}>Customer ID {mockCustomer.customerId}</Text>
        </View>
      </View>

      <View style={styles.metaCard}>
        <View style={styles.metaRow}>
          <Ionicons name="call-outline" size={18} color={colors.textMuted} />
          <Text style={styles.metaText}>{phone}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
          <Text style={styles.metaText}>{email || '—'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={18} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {mockCustomer.city}, {mockCustomer.country}
          </Text>
        </View>
      </View>

      {mockProfileSections.map((section) => (
        <View key={section.title}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menuGroup}>
            {section.items.map((item, index) => (
              <MenuListItem
                key={item.id}
                item={item}
                isLast={index === section.items.length - 1}
                onPress={() => handleMenuPress(item.id)}
              />
            ))}
          </View>
        </View>
      ))}

      <Button
        label="Sign Out"
        variant="outline"
        fullWidth
        onPress={handleSignOut}
        icon={<Ionicons name="log-out-outline" size={18} color={colors.text} />}
      />

      <Text style={styles.version}>Logistix customer app · v1.0.0</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    ...typography.h3,
    color: colors.text,
  },
  role: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  company: {
    ...typography.caption,
    color: colors.accent,
    marginTop: spacing.xs,
    fontWeight: '700',
  },
  metaCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  version: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
