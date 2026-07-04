// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Explicit fade instead of relying on the platform default
        // (slide-from-right on iOS, fade/slide-up on Android). A fade
        // hides the card height jump between signin (2 fields) and
        // signup (4 fields + strength meter) better than a slide does,
        // since nothing is visibly sliding past a resizing card.
        animation: 'fade',
        animationDuration: 220,
      }}
    >
      <Stack.Screen name="signin" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="reset-password" />
      {/* ❌ REMOVED: splash screen is now only shown from RootLayout */}
    </Stack>
  );
}