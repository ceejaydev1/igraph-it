// app/(auth)/splash.tsx (Create this as a separate component or replace the SplashScreen in signin.tsx)

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import { Svg, Circle, Path, Rect, Line } from 'react-native-svg';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── CREATIVE SPLASH SCREEN ──────────────────────────────────────────────────

const CreativeSplashScreen = () => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  
  // Diagram nodes animation
  const node1Scale = useRef(new Animated.Value(0)).current;
  const node2Scale = useRef(new Animated.Value(0)).current;
  const node3Scale = useRef(new Animated.Value(0)).current;
  
  // Connection lines
  const line1Progress = useRef(new Animated.Value(0)).current;
  const line2Progress = useRef(new Animated.Value(0)).current;
  
  // Floating particles
  const particle1Y = useRef(new Animated.Value(0)).current;
  const particle2Y = useRef(new Animated.Value(0)).current;
  const particle3Y = useRef(new Animated.Value(0)).current;
  
  // Loading dots
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;
  
  // Progress bar
  const progressWidth = useRef(new Animated.Value(0)).current;
  
  // Tagline animation
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    // Sequence of animations
    const sequence = Animated.sequence([
      // Phase 1: Logo entrance
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 2: Diagram nodes appear
      Animated.stagger(200, [
        Animated.spring(node1Scale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(node2Scale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(node3Scale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 3: Connection lines draw
      Animated.parallel([
        Animated.timing(line1Progress, {
          toValue: 1,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
        Animated.timing(line2Progress, {
          toValue: 1,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
      ]),
      
      // Phase 4: Particles and tagline
      Animated.parallel([
        // Floating particles
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle1Y, {
              toValue: -20,
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(particle1Y, {
              toValue: 0,
              duration: 1500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle2Y, {
              toValue: -15,
              duration: 1800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(particle2Y, {
              toValue: 0,
              duration: 1800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle3Y, {
              toValue: -25,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(particle3Y, {
              toValue: 0,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ),
        
        // Loading dots
        Animated.loop(
          Animated.stagger(300, [
            Animated.sequence([
              Animated.timing(dot1Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(dot1Opacity, {
                toValue: 0.3,
                duration: 300,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(dot2Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(dot2Opacity, {
                toValue: 0.3,
                duration: 300,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(dot3Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(dot3Opacity, {
                toValue: 0.3,
                duration: 300,
                useNativeDriver: true,
              }),
            ]),
          ])
        ),
        
        // Tagline fade in
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1)),
          useNativeDriver: true,
        }),
        
        // Progress bar
        Animated.timing(progressWidth, {
          toValue: 1,
          duration: 2000,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
      ]),
    ]);

    sequence.start();

    return () => {
      sequence.stop();
    };
  }, []);

  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '0deg'],
  });

  const progressWidthInterpolated = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient}>
        <View style={[styles.gradientOrb, styles.gradientOrb1]} />
        <View style={[styles.gradientOrb, styles.gradientOrb2]} />
        <View style={[styles.gradientOrb, styles.gradientOrb3]} />
      </View>

      {/* Grid pattern overlay */}
      <View style={styles.gridPattern}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLine, styles.gridLineH, { top: `${(i + 1) * 12.5}%` }]} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLine, styles.gridLineV, { left: `${(i + 1) * 12.5}%` }]} />
        ))}
      </View>

      {/* Animated diagram connections */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        {/* Connection lines */}
        <Path
          d={`M ${SCREEN_WIDTH * 0.25} ${SCREEN_HEIGHT * 0.4} Q ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.35}, ${SCREEN_WIDTH * 0.75} ${SCREEN_HEIGHT * 0.4}`}
          stroke="#93a6f5"
          strokeWidth="2"
          strokeDasharray="8 4"
          fill="none"
          opacity={0.4}
        />
        <Path
          d={`M ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.3} L ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.5}`}
          stroke="#93a6f5"
          strokeWidth="2"
          fill="none"
          opacity={0.3}
        />

        {/* Animated diagram nodes */}
        <AnimatedCircle
          cx={SCREEN_WIDTH * 0.25}
          cy={SCREEN_HEIGHT * 0.4}
          r="20"
          fill="none"
          stroke="#3b5bdb"
          strokeWidth="2"
          opacity={0.6}
          scale={node1Scale}
        />
        <AnimatedCircle
          cx={SCREEN_WIDTH * 0.75}
          cy={SCREEN_HEIGHT * 0.4}
          r="16"
          fill="none"
          stroke="#6b8cff"
          strokeWidth="2"
          opacity={0.6}
          scale={node2Scale}
        />
        <AnimatedRect
          x={SCREEN_WIDTH * 0.5 - 20}
          y={SCREEN_HEIGHT * 0.3 - 15}
          width="40"
          height="30"
          rx="8"
          fill="none"
          stroke="#3b5bdb"
          strokeWidth="2"
          opacity={0.6}
          scale={node3Scale}
        />
      </Svg>

      {/* Floating particles */}
      <Animated.View style={[styles.particle, styles.particle1, { transform: [{ translateY: particle1Y }] }]}>
        <View style={styles.particleDot} />
      </Animated.View>
      <Animated.View style={[styles.particle, styles.particle2, { transform: [{ translateY: particle2Y }] }]}>
        <View style={[styles.particleDot, styles.particleDotSmall]} />
      </Animated.View>
      <Animated.View style={[styles.particle, styles.particle3, { transform: [{ translateY: particle3Y }] }]}>
        <View style={[styles.particleDot, styles.particleDotTiny]} />
      </Animated.View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { rotate: logoRotation },
              ],
            },
          ]}
        >
          <Svg width="80" height="80" viewBox="0 0 80 80">
            {/* Outer diagram circle */}
            <Circle cx="40" cy="40" r="35" fill="none" stroke="#3b5bdb" strokeWidth="2.5" />
            
            {/* Inner nodes */}
            <Circle cx="25" cy="30" r="8" fill="#3b5bdb" opacity="0.9" />
            <Circle cx="55" cy="30" r="8" fill="#6b8cff" opacity="0.9" />
            <Circle cx="40" cy="55" r="8" fill="#4c6fff" opacity="0.9" />
            
            {/* Connections */}
            <Line x1="32" y1="32" x2="48" y2="32" stroke="#3b5bdb" strokeWidth="2" opacity="0.6" />
            <Line x1="40" y1="38" x2="40" y2="48" stroke="#3b5bdb" strokeWidth="2" opacity="0.6" />
            <Line x1="34" y1="44" x2="38" y2="49" stroke="#6b8cff" strokeWidth="2" opacity="0.6" />
            <Line x1="46" y1="44" x2="42" y2="49" stroke="#4c6fff" strokeWidth="2" opacity="0.6" />
          </Svg>
        </Animated.View>

        {/* App name */}
        <Animated.Text style={[styles.appName, { opacity: logoOpacity }]}>
          iGraph IT
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          Diagram Your Ideas
        </Animated.Text>

        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                { width: progressWidthInterpolated },
              ]}
            />
          </View>

          {/* Loading dots */}
          <View style={styles.loadingDots}>
            <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
            <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
            <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
          </View>
        </View>
      </View>

      {/* Bottom decoration */}
      <View style={styles.bottomDecoration}>
        <View style={styles.bottomLine} />
        <View style={styles.bottomDots}>
          <View style={styles.bottomDot} />
          <View style={[styles.bottomDot, styles.bottomDotActive]} />
          <View style={styles.bottomDot} />
          <View style={styles.bottomDot} />
        </View>
      </View>
    </View>
  );
};

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Background effects
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
    width: 300,
    height: 300,
    backgroundColor: '#3b5bdb',
    top: -100,
    left: -50,
  },
  gradientOrb2: {
    width: 250,
    height: 250,
    backgroundColor: '#6b8cff',
    bottom: -80,
    right: -60,
  },
  gradientOrb3: {
    width: 200,
    height: 200,
    backgroundColor: '#4c6fff',
    top: '40%',
    left: '60%',
    opacity: 0.1,
  },
  
  // Grid pattern
  gridPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#ffffff',
  },
  gridLineH: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  
  // Floating particles
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  particle1: {
    top: '25%',
    left: '20%',
  },
  particle2: {
    top: '35%',
    right: '25%',
  },
  particle3: {
    top: '60%',
    left: '30%',
  },
  particleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b5bdb',
    opacity: 0.6,
  },
  particleDotSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6b8cff',
    opacity: 0.5,
  },
  particleDotTiny: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#4c6fff',
    opacity: 0.4,
  },
  
  // Main content
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    zIndex: 1,
  },
  
  // Logo
  logoContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(59, 91, 219, 0.1)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(59, 91, 219, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#3b5bdb',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  
  // App name
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-black',
      },
    }),
  },
  
  // Tagline
  tagline: {
    fontSize: 16,
    color: '#8896b3',
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 48,
  },
  
  // Loading indicator
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  
  // Progress bar
  progressBarContainer: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b5bdb',
    borderRadius: 2,
  },
  
  // Loading dots
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b5bdb',
  },
  
  // Bottom decoration
  bottomDecoration: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    gap: 12,
  },
  bottomLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(59, 91, 219, 0.3)',
    borderRadius: 1,
  },
  bottomDots: {
    flexDirection: 'row',
    gap: 6,
  },
  bottomDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomDotActive: {
    backgroundColor: '#3b5bdb',
    width: 12,
    borderRadius: 2,
  },
});

// Animated SVG components
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default CreativeSplashScreen;