// app/(auth)/splash.tsx

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish?: () => void;
  progress?: number;
}

export default function CreativeSplashScreen({ 
  onFinish, 
  progress = 0 
}: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entranceAnimation = Animated.sequence([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(300),
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
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
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, onFinish]);

  const progressWidthInterpolated = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Generate grid lines
  const horizontalLines = Array.from({ length: 12 }).map((_, i) => ({
    key: `h-${i}`,
    top: (SCREEN_HEIGHT / 13) * (i + 1),
  }));

  const verticalLines = Array.from({ length: 8 }).map((_, i) => ({
    key: `v-${i}`,
    left: (SCREEN_WIDTH / 9) * (i + 1),
  }));

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>
      {/* Background orbs */}
      <View style={styles.backgroundGradient}>
        <View style={[styles.gradientOrb, styles.gradientOrb1]} />
        <View style={[styles.gradientOrb, styles.gradientOrb2]} />
        <View style={[styles.gradientOrb, styles.gradientOrb3]} />
      </View>

      {/* Grid pattern */}
      <View style={styles.gridPattern} pointerEvents="none">
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

      <View style={styles.content}>
        {/* Logo - No circle container, just the image */}
        <Animated.Image
          source={require('../../assets/images/logo.png')}
          style={[
            styles.logo,
            {
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { translateY: logoTranslateY },
              ],
            },
          ]}
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
            { opacity: loadingOpacity },
          ]}
        >
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { width: progressWidthInterpolated },
                ]}
              />
            </View>
            <View style={styles.progressBarGlow} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
    justifyContent: 'center',
    alignItems: 'center',
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
  progressBarWrapper: {
    width: 280,
    position: 'relative',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 3,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#4c6fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4c6fff',
    borderRadius: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#4c6fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  progressBarGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 3,
    backgroundColor: 'rgba(76, 111, 255, 0.2)',
    opacity: 0.5,
  },
});