import { Ionicons } from '@expo/vector-icons';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';
import { useAssignedSalesAgent } from '@/hooks/useAssignedSalesAgent';
import { useAuth } from '@/providers';
import { salesAgentWhatsAppUrl } from '@/utils/sales-agent-contact';

/**
 * Floating WhatsApp shortcut for the customer's CURRENT assigned Sales Agent.
 * Uses the same session RPC as Profile → Support (contacts.salesperson_id).
 */
export function AssignedSalesAgentWhatsAppFab() {
  const insets = useSafeAreaInsets();
  const { sessionToken, isAuthenticated } = useAuth();
  const { data: agent } = useAssignedSalesAgent(sessionToken);

  if (!isAuthenticated) {
    return null;
  }

  const whatsappUrl = salesAgentWhatsAppUrl(agent?.phone);
  if (!agent || !whatsappUrl) {
    return null;
  }

  const openWhatsApp = async () => {
    try {
      await Linking.openURL(whatsappUrl);
    } catch {
      Alert.alert(
        'Unable to open WhatsApp',
        'Please try again from Profile → Support, or call your Sales Agent.',
      );
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: Math.max(insets.bottom, 8) + 64,
          right: spacing.lg + Math.max(insets.right, 0),
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`WhatsApp ${agent.name}`}
        onPress={() => void openWhatsApp()}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons name="logo-whatsapp" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 50,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 5,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
});
