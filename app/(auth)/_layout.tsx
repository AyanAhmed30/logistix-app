import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SignupFlowProvider } from '@/hooks/useSignupFlow';

export default function AuthLayout() {
  return (
    <SignupFlowProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="splash" />
        <Stack.Screen name="home" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="signup-wizard" />
        <Stack.Screen name="login" />
        <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
    </SignupFlowProvider>
  );
}
