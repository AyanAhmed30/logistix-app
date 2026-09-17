import { Image, StyleSheet, Text, TextInput as RNTextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { webNoFocusRing } from '@/utils/web-focus';

const pakistanFlag = require('../../../assets/flags/pk.png');

type PakistanPhoneFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  label?: string;
};

/** Fixed +92 with real Pakistan flag; user types the remaining local mobile digits. */
export function PakistanPhoneField({
  value,
  onChangeText,
  onBlur,
  error,
  hint = 'Enter your 10-digit mobile number (e.g. 3001234567)',
  label = 'Phone Number',
}: PakistanPhoneFieldProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.row, error ? styles.rowError : null]}>
        <View style={styles.prefix}>
          <Image
            source={pakistanFlag}
            style={styles.flag}
            resizeMode="cover"
            accessibilityLabel="Pakistan flag"
          />
          <Text style={styles.code}>+92</Text>
        </View>
        <View style={styles.divider} />
        <RNTextInput
          style={[styles.input, webNoFocusRing]}
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/[^\d]/g, '').slice(0, 11))}
          onBlur={onBlur}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="3001234567"
          placeholderTextColor={colors.textMuted}
          maxLength={11}
          underlineColorAndroid="transparent"
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
    width: '100%',
  },
  label: {
    ...typography.label,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 52,
    overflow: 'hidden',
    width: '100%',
  },
  rowError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  flag: {
    width: 28,
    height: 20,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  code: {
    ...typography.label,
    fontSize: 15,
    color: colors.text,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minWidth: 0,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
