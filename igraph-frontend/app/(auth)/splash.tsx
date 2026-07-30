import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import Svg, { Circle, Rect, Polygon, Line, G } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedG = Animated.createAnimatedComponent(G);

// ─── Mini flowchart loader ──────────────────────────────────────────────────
// The loading indicator is a tiny flowchart assembling itself — Terminator →
// Process → Decision → Terminator, the app's own Flowchart shape vocabulary —
// instead of a generic progress bar. Every other main screen ties back into
// what this app actually does (the node/marker motif in the diagram detail
// screen, the dashed "placeholder, not final artwork" language); this makes
// the very first thing a user sees do the same.
const LOADER_WIDTH = 280;
const LOADER_HEIGHT = 64;
const NODE_Y = 32;
const NODE_XS = [20, 100, 180, 260];
const TERM_R = 9;
const RECT_W = 34;
const RECT_H = 20;
const DIAMOND_HALF_W = 15;
const DIAMOND_HALF_H = 11;

// Line endpoints sit at each shape's edge, not its center, so the connecting
// lines visually terminate against the shapes instead of running under them.
const SEGMENTS = [
  { x1: NODE_XS[0] + TERM_R, x2: NODE_XS[1] - RECT_W / 2 },
  { x1: NODE_XS[1] + RECT_W / 2, x2: NODE_XS[2] - DIAMOND_HALF_W },
  { x1: NODE_XS[2] + DIAMOND_HALF_W, x2: NODE_XS[3] - TERM_R },
];

function diamondPoints(cx: number, cy: number): string {
  return `${cx},${cy - DIAMOND_HALF_H} ${cx + DIAMOND_HALF_W},${cy} ${cx},${cy + DIAMOND_HALF_H} ${cx - DIAMOND_HALF_W},${cy}`;
}

// Composed by hand (translate to origin, scale, translate back) rather than
// relying on an SVG "transform-origin" prop, so the shape scales around its
// own center point instead of the SVG canvas's (0,0) corner.
function popTransform(cx: number, cy: number, scale: number): string {
  return `translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`;
}

interface DiagramLoaderProps {
  progressValue: Animated.Value;
}

// Each segment "draws" across its own third of the total progress, and the
// node at its far end pops in — with a slight overshoot, not a flat fade —
// right as the line reaches it: a small "connection made" beat instead of a
// featureless percentage tick. The starting Terminator is solid from frame
// one (it represents "loading has begun," not something to wait for); a
// faint outline of the full destination shape is visible throughout so the
// diagram being built is legible immediately, not appearing out of empty
// space.
const DiagramLoader: React.FC<DiagramLoaderProps> = ({ progressValue }) => {
  const seg1Draw = progressValue.interpolate({ inputRange: [0, 0.32], outputRange: [0, 1], extrapolate: 'clamp' });
  const seg2Draw = progressValue.interpolate({ inputRange: [0.34, 0.64], outputRange: [0, 1], extrapolate: 'clamp' });
  const seg3Draw = progressValue.interpolate({ inputRange: [0.66, 0.96], outputRange: [0, 1], extrapolate: 'clamp' });

  const node1Opacity = progressValue.interpolate({ inputRange: [0.26, 0.34], outputRange: [0, 1], extrapolate: 'clamp' });
  const node2Opacity = progressValue.interpolate({ inputRange: [0.58, 0.66], outputRange: [0, 1], extrapolate: 'clamp' });
  const node3Opacity = progressValue.interpolate({ inputRange: [0.9, 0.98], outputRange: [0, 1], extrapolate: 'clamp' });

  const node1Pop = progressValue.interpolate({
    inputRange: [0.26, 0.31, 0.38],
    outputRange: [popTransform(NODE_XS[1], NODE_Y, 0.3), popTransform(NODE_XS[1], NODE_Y, 1.18), popTransform(NODE_XS[1], NODE_Y, 1)],
    extrapolate: 'clamp',
  });
  const node2Pop = progressValue.interpolate({
    inputRange: [0.58, 0.63, 0.7],
    outputRange: [popTransform(NODE_XS[2], NODE_Y, 0.3), popTransform(NODE_XS[2], NODE_Y, 1.18), popTransform(NODE_XS[2], NODE_Y, 1)],
    extrapolate: 'clamp',
  });
  const node3Pop = progressValue.interpolate({
    inputRange: [0.9, 0.95, 1],
    outputRange: [popTransform(NODE_XS[3], NODE_Y, 0.3), popTransform(NODE_XS[3], NODE_Y, 1.18), popTransform(NODE_XS[3], NODE_Y, 1)],
    extrapolate: 'clamp',
  });

  // Soft pulse behind the whole diagram once it's fully connected — echoes
  // the glow the old bar had, just moved onto shapes instead of a fill.
  const completeGlow = progressValue.interpolate({ inputRange: [0.97, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  const seg1Length = SEGMENTS[0].x2 - SEGMENTS[0].x1;
  const seg2Length = SEGMENTS[1].x2 - SEGMENTS[1].x1;
  const seg3Length = SEGMENTS[2].x2 - SEGMENTS[2].x1;

  return (
    <View style={styles.loaderWrap}>
      <Animated.View style={[styles.loaderGlow, { opacity: completeGlow }]} pointerEvents="none" />
      <Svg width={LOADER_WIDTH} height={LOADER_HEIGHT}>
        <Circle cx={NODE_XS[0]} cy={NODE_Y} r={TERM_R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
        <Rect x={NODE_XS[1] - RECT_W / 2} y={NODE_Y - RECT_H / 2} width={RECT_W} height={RECT_H} rx={5} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
        <Polygon points={diamondPoints(NODE_XS[2], NODE_Y)} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
        <Circle cx={NODE_XS[3]} cy={NODE_Y} r={TERM_R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />

        <Line x1={SEGMENTS[0].x1} x2={SEGMENTS[0].x2} y1={NODE_Y} y2={NODE_Y} stroke="rgba(255,255,255,0.12)" strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={SEGMENTS[1].x1} x2={SEGMENTS[1].x2} y1={NODE_Y} y2={NODE_Y} stroke="rgba(255,255,255,0.12)" strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={SEGMENTS[2].x1} x2={SEGMENTS[2].x2} y1={NODE_Y} y2={NODE_Y} stroke="rgba(255,255,255,0.12)" strokeWidth={2.5} strokeLinecap="round" />

        <AnimatedLine
          x1={SEGMENTS[0].x1} x2={SEGMENTS[0].x2} y1={NODE_Y} y2={NODE_Y}
          stroke="#4c6fff" strokeWidth={2.5} strokeLinecap="round"
          strokeDasharray={`${seg1Length}, ${seg1Length}`}
          strokeDashoffset={seg1Draw.interpolate({ inputRange: [0, 1], outputRange: [seg1Length, 0] })}
        />
        <AnimatedLine
          x1={SEGMENTS[1].x1} x2={SEGMENTS[1].x2} y1={NODE_Y} y2={NODE_Y}
          stroke="#4c6fff" strokeWidth={2.5} strokeLinecap="round"
          strokeDasharray={`${seg2Length}, ${seg2Length}`}
          strokeDashoffset={seg2Draw.interpolate({ inputRange: [0, 1], outputRange: [seg2Length, 0] })}
        />
        <AnimatedLine
          x1={SEGMENTS[2].x1} x2={SEGMENTS[2].x2} y1={NODE_Y} y2={NODE_Y}
          stroke="#4c6fff" strokeWidth={2.5} strokeLinecap="round"
          strokeDasharray={`${seg3Length}, ${seg3Length}`}
          strokeDashoffset={seg3Draw.interpolate({ inputRange: [0, 1], outputRange: [seg3Length, 0] })}
        />

        <Circle cx={NODE_XS[0]} cy={NODE_Y} r={TERM_R} fill="#4c6fff" />

        <AnimatedG transform={node1Pop} opacity={node1Opacity}>
          <Rect x={NODE_XS[1] - RECT_W / 2} y={NODE_Y - RECT_H / 2} width={RECT_W} height={RECT_H} rx={5} fill="#4c6fff" />
        </AnimatedG>

        <AnimatedG transform={node2Pop} opacity={node2Opacity}>
          <Polygon points={diamondPoints(NODE_XS[2], NODE_Y)} fill="#4c6fff" />
        </AnimatedG>

        <AnimatedG transform={node3Pop} opacity={node3Opacity}>
          <Circle cx={NODE_XS[3]} cy={NODE_Y} r={TERM_R} fill="#4c6fff" />
        </AnimatedG>
      </Svg>
    </View>
  );
};

interface SplashScreenProps {
  onFinish?: () => void;
  progress?: number;
}

export default function CreativeSplashScreen({
  onFinish,
  progress = 0
}: SplashScreenProps) {
  // The logo is rendered fully visible from the very first frame (no entrance
  // animation of its own) because it needs to continue seamlessly from the
  // OS/PWA launch icon that was already on screen — animating it in from
  // hidden made it flicker (vanish, then pop back in with a jump). Only the
  // dark backdrop and the extra content (title, diagram loader) fade in
  // around/after the already-visible logo.
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const backdropFadeIn = useRef(new Animated.Value(0)).current;
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entranceAnimation = Animated.sequence([
      Animated.timing(backdropFadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]);

    entranceAnimation.start();

    return () => {
      entranceAnimation.stop();
    };
  }, []);

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 300,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  useEffect(() => {
    if (progress >= 1 && onFinish) {
      const timer = setTimeout(() => {
        onFinish();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [progress, onFinish]);

  const horizontalLines = Array.from({ length: 12 }).map((_, i) => ({
    key: `h-${i}`,
    top: (SCREEN_HEIGHT / 13) * (i + 1),
  }));

  const verticalLines = Array.from({ length: 8 }).map((_, i) => ({
    key: `v-${i}`,
    left: (SCREEN_WIDTH / 9) * (i + 1),
  }));

  return (
    <View style={styles.container}>
      {/* Dark backdrop fades in on its own, behind the logo, so the logo
          never has to disappear-and-reappear while it comes in. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropFadeIn }]}
        pointerEvents="none"
      >
        <View style={styles.backgroundGradient}>
          <View style={[styles.gradientOrb, styles.gradientOrb1]} />
          <View style={[styles.gradientOrb, styles.gradientOrb2]} />
          <View style={[styles.gradientOrb, styles.gradientOrb3]} />
        </View>

        <View style={styles.gridPattern}>
          {horizontalLines.map(({ key, top }) => (
            <View
              key={key}
              style={[
                styles.gridLineH,
                { top },
              ]}
            />
          ))}
          {verticalLines.map(({ key, left }) => (
            <View
              key={key}
              style={[
                styles.gridLineV,
                { left },
              ]}
            />
          ))}
        </View>
      </Animated.View>

      <View style={styles.content}>
        <Image
          source={require('../../assets/images/logo1.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Animated.Text
          style={[
            styles.appName,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          iGraph IT
        </Animated.Text>

        <Animated.View
          style={[
            styles.loadingContainer,
            { opacity: backdropFadeIn },
          ]}
        >
          <DiagramLoader progressValue={animatedProgress} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Opaque white, matching the native/PWA launch screen behind the icon.
    // The logo continues straight off that white screen with no cut, and
    // the dark backdrop below fades in over it — that fade *is* the
    // transition into the splash screen. Without this white base the
    // container would be transparent and the real screen mounted
    // underneath (signin/home) would show through before the backdrop
    // finishes darkening.
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    backgroundColor: '#0a0e27',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gradientOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  gradientOrb1: {
    width: 350,
    height: 350,
    backgroundColor: '#4c6fff',
    top: -150,
    left: -100,
  },
  gradientOrb2: {
    width: 280,
    height: 280,
    backgroundColor: '#6b8cff',
    bottom: -120,
    right: -80,
  },
  gradientOrb3: {
    width: 200,
    height: 200,
    backgroundColor: '#4c6fff',
    top: SCREEN_HEIGHT * 0.5,
    left: SCREEN_WIDTH * 0.6,
    opacity: 0.1,
  },
  gridPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#ffffff',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    zIndex: 1,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 0,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-black',
      },
    }),
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
  },
  loaderWrap: {
    width: LOADER_WIDTH,
    height: LOADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Approximates a soft radial glow behind the completed diagram — RN has no
  // real radial gradient without an extra dependency, so a large, softly-
  // shadowed/blurred translucent blob stands in for one.
  loaderGlow: {
    position: 'absolute',
    top: -14,
    left: 8,
    right: 8,
    bottom: -14,
    borderRadius: 32,
    backgroundColor: 'rgba(76, 111, 255, 0.28)',
    ...Platform.select({
      web: { filter: 'blur(20px)' } as any,
      ios: {
        shadowColor: '#4c6fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
