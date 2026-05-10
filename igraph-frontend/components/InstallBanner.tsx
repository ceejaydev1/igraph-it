// components/InstallBanner.tsx
// iGraph IT PWA Install Banner - Mobile Only
// Shows at the TOP of screen on mobile browsers when app is installable

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Animated,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface InstallBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function InstallBanner({ visible, onDismiss }: InstallBannerProps) {
  const slideAnim = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (visible) {
      // Slide DOWN into view
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      // Slide UP out of view
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleInstall = async () => {
    if (typeof window !== 'undefined' && (window as any).triggerPWAInstall) {
      const accepted = await (window as any).triggerPWAInstall();
      if (accepted) onDismiss();
    }
  };

  // Only render on web
  if (Platform.OS !== 'web') return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>

      {/* Left: Logo + Text */}
      <View style={styles.left}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.textWrap}>
          <Text style={styles.title}>Install iGraph IT</Text>
          <Text style={styles.subtitle}>Get a better app experience</Text>
        </View>
      </View>

      {/* Right: Install + Dismiss */}
      <View style={styles.right}>
        <TouchableOpacity
          style={styles.installBtn}
          onPress={handleInstall}
          activeOpacity={0.85}
        >
          <Text style={styles.installText}>Install</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={onDismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e6f3',
    shadowColor: '#3b5bdb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    // Mobile-specific styling
    width: SCREEN_WIDTH,
  },

  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },

  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0a0f1e',
  },

  textWrap: {
    flex: 1,
  },

  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1f36',
  },

  subtitle: {
    fontSize: 12,
    color: '#8896b3',
    marginTop: 2,
  },

  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  installBtn: {
    backgroundColor: '#3b5bdb',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },

  installText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  dismissBtn: {
    padding: 6,
  },

  dismissText: {
    fontSize: 16,
    color: '#8896b3',
    fontWeight: '600',
  },
});