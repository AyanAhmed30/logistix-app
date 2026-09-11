import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { APP_ROUTES, newRequestHref } from '@/navigation/routes';

type RequestsSection = 'requests' | 'drafts' | 'new';

type Props = {
  active: RequestsSection;
};

export function RequestsSubNav({ active }: Props) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <NavChip
        label="My Requests"
        selected={active === 'requests'}
        onPress={() => router.push(APP_ROUTES.inquiries as Href)}
      />
      <NavChip
        label="Draft Requests"
        selected={active === 'drafts'}
        onPress={() => router.push(APP_ROUTES.inquiryDrafts as Href)}
      />
      <NavChip
        label="New Request"
        selected={active === 'new'}
        onPress={() => router.push(newRequestHref() as Href)}
      />
    </View>
  );
}

function NavChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.surface,
  },
});
