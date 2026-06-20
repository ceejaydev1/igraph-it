// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="signin" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="reset-password" />
      {/* ❌ REMOVED: splash screen is now only shown from RootLayout */}
    </Stack>
  );
}