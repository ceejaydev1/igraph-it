import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as authService from '../services/authService';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // Where an authenticated user resumes to — the screen they were last on,
  // or Home if nothing was recorded (e.g. first-ever sign-in this session).
  const [lastRoute, setLastRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // No client-side token presence check first — on web the session
        // lives in an httpOnly cookie JS can never read, so "no token" isn't
        // a meaningful signal there. verifyToken() already applies the right
        // fast-path per platform (native still skips the network call when
        // there's clearly no token).
        const [result, savedRoute] = await Promise.all([
          authService.verifyToken(),
          authService.getLastRoute(),
        ]);
        // A failed live check alone is NOT "signed out" — it's only ever a
        // network hiccup, a cold-starting backend, or a momentary server
        // error, none of which mean this session is actually gone. The only
        // thing that should ever land someone back on signin is the user
        // explicitly clicking Sign Out (which also clears the cached user —
        // see logout() in authService.js), so a cached user surviving from a
        // prior successful sign-in is what "still signed in" really means
        // here, not this one live request succeeding.
        const cached = result.success ? null : await authService.getCachedUser();
        setIsAuthenticated(result.success || !!cached);
        setLastRoute(savedRoute);
      } catch (error) {
        const cached = await authService.getCachedUser();
        setIsAuthenticated(!!cached);
      }
    };

    checkAuth();
  }, []);

  // Return nothing (just background) while checking
  if (isAuthenticated === null) {
    return <View style={styles.container} />;
  }

  // Guard against a corrupt/stale saved value (e.g. an old app version wrote
  // a different shape, or storage got tampered with) — only ever trust it if
  // it still looks like a route this app actually saves (see _layout.tsx),
  // otherwise fall back to Home instead of handing Redirect a bad href.
  const isValidSavedRoute = typeof lastRoute === 'string' && lastRoute.startsWith('/(tabs)');
  const destination = isAuthenticated
    ? (isValidSavedRoute ? lastRoute : '/(tabs)/home')
    : '/(auth)/signin';

  // React Navigation's web linking preserves the literal href a route was
  // reached with in the address bar as long as it still resolves back to
  // the same screen (see useLinking.js `getPathForRoute`), instead of always
  // recomputing the canonical URL. Group segments like "(auth)" or "(tabs)"
  // are only ever stripped from that recomputed canonical form — never from
  // a preserved literal one — so redirecting with the group-qualified href
  // above made the address bar flash the literal "/(auth)/signin" before a
  // later state change corrected it to "/signin". Stripping the group here
  // means the literal and canonical forms already match, so there's nothing
  // left to correct.
  const canonicalDestination = destination.replace(/\/\([^/]+\)/g, '');

  // Instant redirect - NO SPINNER
  return <Redirect href={canonicalDestination as any} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
});