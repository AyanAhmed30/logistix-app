import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, MenuListItem, ScreenContainer } from '@/components/ui';
import { mockProfileSections, mockUser } from '@/data/mock/profile';
import { colors, radius, spacing, typography } from '@/constants/theme';

/**
 * Profile Screen
 *
 * Purpose: Account hub — user identity, settings navigation, and sign-out affordance.
 * Menu items are visual only with placeholder press handlers.
 */
export default function ProfileScreen() {
  const handleMenuPress = (_id: string) => {
    // UI placeholder
  };

  const handleSignOut = () => {
    // UI placeholder — no auth logic
  };

  return (
    <ScreenContainer title="Profile" subtitle="Manage your account">
      <View style={styles.profileCard}>
        <Avatar initials={mockUser.avatarInitials} size="lg" />
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{mockUser.name}</Text>
          <Text style={styles.role}>{mockUser.role}</Text>
          <Text style={styles.company}>{mockUser.company}</Text>
        </View>
        <View style={styles.editBtn}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </View>
      </View>

      <View style={styles.emailCard}>
        <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
        <Text style={styles.email}>{mockUser.email}</Text>
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

      <Text style={styles.version}>Logistix v1.0.0</Text>
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
    color: colors.primary,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  email: {
    ...typography.bodySmall,
    color: colors.textSecondary,
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
