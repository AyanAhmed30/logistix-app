import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/constants/theme';

type AuthFooterLinkProps = {
  prompt: string;
  linkLabel: string;
  onPress: () => void;
};

export function AuthFooterLink({ prompt, linkLabel, onPress }: AuthFooterLinkProps) {
  return (
    <View style={styles.footer}>
      {prompt ? <Text style={styles.footerText}>{prompt}</Text> : null}
      <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
        <Text style={styles.footerLink}>{linkLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  footerText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.95)',
  },
  footerLink: {
    ...typography.label,
    color: '#E6FFFB',
    fontWeight: '800',
  },
});
