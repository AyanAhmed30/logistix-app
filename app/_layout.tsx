import 'react-native-get-random-values';
import 'react-native-gesture-handler';

import { Stack } from 'expo-router';

import { AppProviders } from '@/providers';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </AppProviders>
  );
}
