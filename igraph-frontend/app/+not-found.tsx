import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Svg, Path, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS, BREAKPOINTS } from '@/constants/theme';

// ─── Ambient background ─────────────────────────────────────────────────────
// Same recipe as the (auth) screens (signin.tsx's DiagramBackground): a soft
// gradient wash, the shared grid-bg texture, and a couple of blurred color
// blobs. Reusing it here — rather than inventing a new background for this
// one screen — is what keeps a 404 from reading as a bolted-on afterthought;
// it's the same "you're still inside iGraph IT" surface as sign-in/sign-up.
const AmbientBackground = ({ width, height }: { width: number; height: number }) => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFillObject}>
      <Defs>
        <LinearGradient id="notFoundWash" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#e8edff" stopOpacity="1" />
          <Stop offset="55%" stopColor="#eef2ff" stopOpacity="1" />
          <Stop offset="100%" stopColor="#e3e9ff" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="notFoundBlobTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.5" />
          <Stop offset="100%" stopColor="#c7d2fe" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="notFoundBlobBottom" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#b6c2ff" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#b6c2ff" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#notFoundWash)" />
      <Circle cx={width * 0.92} cy={height * 0.06} r={width * 0.5} fill="url(#notFoundBlobTop)" />
      <Circle cx={width * 0.04} cy={height * 0.98} r={width * 0.45} fill="url(#notFoundBlobBottom)" />
    </Svg>

    <Image source={require('../assets/images/grid-bg.png')} style={styles.gridBackground} resizeMode="repeat" />
    <View style={styles.gridOverlay} />
  </View>
);

// ─── Focal illustration ──────────────────────────────────────────────────────
// The actual "joke" of this page, told in the app's own visual language
// instead of a generic stock graphic: a tiny 3-node flowchart — Home, a
// search/decision step, and a dashed "ghost" node that was never wired up —
// with the connector into that last node visibly broken. Same shape/stroke
// conventions as constants/icons.tsx (strokeWidth ~2, rounded caps) and the
// dashed/faded style DiagramCanvas already uses for an unconfirmed
// connection, so it reads as "drawn by this app," not an imported asset.
const BrokenFlowIllustration = ({ scale }: { scale: number }) => {
  const w = 330;
  const h = 160;
  return (
    <Svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`}>
      {/* Home node */}
      <Rect x={14} y={56} width={84} height={48} rx={10} fill="#ffffff" stroke={COLORS.primary} strokeWidth={2} />
      <Rect x={48} y={76} width={16} height={12} fill="none" stroke={COLORS.primary} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M 44 76 L 56 64 L 68 76" fill="none" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Solid connector: Home → decision */}
      <Path d="M 98 80 L 130 80" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
      <Path d="M 130 74 L 140 80 L 130 86 Z" fill={COLORS.primary} />

      {/* Decision node (diamond) with a search glyph — "looking for your page" */}
      <Path
        d="M 168 50 L 198 80 L 168 110 L 138 80 Z"
        fill="#ffffff"
        stroke={COLORS.primary}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Circle cx={164} cy={77} r={8} fill="none" stroke={COLORS.primary} strokeWidth={2} />
      <Path d="M 170 83 L 177 90" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />

      {/* Broken connector: decision → the page that isn't there */}
      <Path d="M 198 80 L 210 80" stroke={COLORS.gray400} strokeWidth={2} strokeDasharray="4 3" strokeLinecap="round" />
      <Path d="M 220 80 L 230 80" stroke={COLORS.gray400} strokeWidth={2} strokeDasharray="4 3" strokeLinecap="round" />
      {/* Break mark */}
      <Path d="M 211 75 L 219 85 M 219 75 L 211 85" stroke={COLORS.danger} strokeWidth={2} strokeLinecap="round" />

      {/* Ghost node — deliberately empty; there's nothing to show because there's nothing there */}
      <Rect
        x={230}
        y={54}
        width={86}
        height={52}
        rx={10}
        fill={COLORS.primaryLight}
        fillOpacity={0.5}
        stroke={COLORS.gray400}
        strokeWidth={2}
        strokeDasharray="5 4"
      />
    </Svg>
  );
};

export default function NotFoundScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isMobile = width < BREAKPOINTS.tablet;

  const goHome = () => router.replace('/(tabs)/home');

  return (
    <View style={styles.container}>
      <AmbientBackground width={width} height={height} />

      <View style={[styles.content, { maxWidth: isMobile ? 340 : 440 }]}>
        <BrokenFlowIllustration scale={isMobile ? 0.85 : 1} />

        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>This connector leads nowhere.</Text>
        <Text style={styles.subtitle}>
          The page you're looking for doesn't exist, it may have been moved, renamed,
          or the link was never wired up correctly.
        </Text>

        <View style={styles.actions}>
          <Pressable
            onPress={goHome}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          >
            <Text style={styles.primaryButtonText}>Back to Diagram Library</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
  },
  gridBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  content: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
  },
  code: {
    ...TYPOGRAPHY.h1,
    fontSize: 56,
    lineHeight: 60,
    color: COLORS.primary,
    marginTop: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.gray900,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    maxWidth: 380,
  },
  actions: {
    alignItems: 'center',
    marginTop: SPACING.xxl,
    gap: SPACING.lg,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxxl,
    borderRadius: RADIUS.lg,
    ...SHADOWS.primary,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null),
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
});
