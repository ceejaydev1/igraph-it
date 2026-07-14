import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  useWindowDimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Shimmer animation component
export const Shimmer = ({ 
  width, 
  height, 
  borderRadius = 8, 
  style = {},
  marginBottom = 0,
}: { 
  width: number | string; 
  height: number; 
  borderRadius?: number; 
  style?: any;
  marginBottom?: number;
}) => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const shimmerTranslate = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const actualWidth = typeof width === 'number' ? width : 200;

  return (
    <View 
      style={[
        styles.shimmerContainer, 
        { 
          width, 
          height, 
          borderRadius,
          marginBottom,
        }, 
        style
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX: shimmerTranslate }],
            width: actualWidth * 2,
          },
        ]}
      />
    </View>
  );
};

// Card Skeleton for home grid
export const CardSkeleton = () => {
  const { width } = useWindowDimensions();
  const cardWidth = width < 768 ? width - 32 : width < 1024 ? (width - 44) / 2 : 300;
  
  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <Shimmer width="100%" height={120} borderRadius={12} />
      <View style={styles.cardContent}>
        <Shimmer width="80%" height={20} borderRadius={4} style={{ marginBottom: 12 }} />
        <Shimmer width="40%" height={16} borderRadius={4} />
      </View>
    </View>
  );
};

// Home Grid Skeleton
export const HomeGridSkeleton = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  return (
    <View style={styles.homeContainer}>
      {/* Header skeleton */}
      <View style={styles.homeHeader}>
        <Shimmer width="100%" height={44} borderRadius={12} style={{ maxWidth: 640 }} />
        <View style={styles.tabsSkeleton}>
          <Shimmer width={80} height={36} borderRadius={20} />
          <Shimmer width={80} height={36} borderRadius={20} />
          <Shimmer width={80} height={36} borderRadius={20} />
        </View>
      </View>
      
      {/* Grid skeleton */}
      <View style={styles.gridContainer}>
        {[...Array(isDesktop ? 12 : 6)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </View>
    </View>
  );
};

// Auth Form Skeleton (Sign In / Sign Up)
export const AuthFormSkeleton = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  
  return (
    <View style={styles.authContainer}>
      <View style={[styles.authCard, isDesktop && styles.authCardDesktop]}>
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <Shimmer width={64} height={64} borderRadius={32} />
        </View>
        
        {/* Title */}
        <Shimmer width={180} height={32} borderRadius={4} style={{ alignSelf: 'center', marginBottom: 12 }} />
        <Shimmer width={220} height={16} borderRadius={4} style={{ alignSelf: 'center', marginBottom: 32 }} />
        
        {/* Form fields */}
        <View style={styles.formGroup}>
          <Shimmer width={80} height={14} borderRadius={4} style={{ marginBottom: 8 }} />
          <Shimmer width="100%" height={44} borderRadius={12} />
        </View>
        
        <View style={styles.formGroup}>
          <Shimmer width={80} height={14} borderRadius={4} style={{ marginBottom: 8 }} />
          <Shimmer width="100%" height={44} borderRadius={12} />
        </View>
        
        {/* Options row */}
        <View style={styles.optionsSkeleton}>
          <Shimmer width={100} height={16} borderRadius={4} />
          <Shimmer width={100} height={16} borderRadius={4} />
        </View>
        
        {/* Sign In button */}
        <Shimmer width="100%" height={48} borderRadius={12} style={{ marginTop: 8 }} />
        
        {/* Divider */}
        <View style={styles.divider}>
          <Shimmer width="40%" height={1} borderRadius={0} />
          <Shimmer width={40} height={14} borderRadius={4} />
          <Shimmer width="40%" height={1} borderRadius={0} />
        </View>
        
        {/* Google button */}
        <Shimmer width="100%" height={48} borderRadius={12} />
        
        {/* Terms */}
        <View style={styles.termsRow}>
          <Shimmer width={18} height={18} borderRadius={9} />
          <Shimmer width="80%" height={14} borderRadius={4} />
        </View>
        
        {/* Sign up link */}
        <View style={styles.signupRow}>
          <Shimmer width={120} height={14} borderRadius={4} />
          <Shimmer width={60} height={14} borderRadius={4} style={{ marginLeft: 4 }} />
        </View>
      </View>
    </View>
  );
};

// Diagram Detail Skeleton
export const DiagramDetailSkeleton = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  return (
    <View style={styles.detailContainer}>
      {/* Hero Section */}
      <View style={styles.heroSkeleton}>
        <Shimmer width={80} height={24} borderRadius={20} style={{ marginBottom: 16 }} />
        <Shimmer width="70%" height={36} borderRadius={4} style={{ marginBottom: 12 }} />
        <Shimmer width="50%" height={20} borderRadius={4} />
      </View>
      
      {/* Content */}
      <View style={[styles.detailContent, isDesktop && styles.detailContentDesktop]}>
        {/* Left column - Visual */}
        <View style={[styles.visualColumnSkeleton, isDesktop && styles.visualColumnSkeletonDesktop]}>
          <Shimmer width="100%" height={220} borderRadius={12} />
          <Shimmer width="100%" height={48} borderRadius={12} style={{ marginTop: 16 }} />
          <Shimmer width="100%" height={200} borderRadius={12} style={{ marginTop: 16 }} />
        </View>
        
        {/* Right column - Content */}
        <View style={[styles.contentColumnSkeleton, isDesktop && styles.contentColumnSkeletonDesktop]}>
          {[...Array(3)].map((_, i) => (
            <View key={i} style={styles.sectionSkeleton}>
              <Shimmer width="40%" height={20} borderRadius={4} style={{ marginBottom: 12 }} />
              <Shimmer width="100%" height={80} borderRadius={8} />
            </View>
          ))}
          <View style={styles.sectionSkeleton}>
            <Shimmer width="40%" height={20} borderRadius={4} style={{ marginBottom: 12 }} />
            {[...Array(5)].map((_, j) => (
              <View key={j} style={styles.stepSkeleton}>
                <Shimmer width={24} height={24} borderRadius={12} />
                <Shimmer width="85%" height={16} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

// Navbar Skeleton
export const NavbarSkeleton = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  if (isDesktop) {
    return (
      <View style={styles.navbarDesktop}>
        <View style={styles.navbarLeft}>
          <Shimmer width={36} height={36} borderRadius={8} />
          <Shimmer width={100} height={20} borderRadius={4} />
        </View>
        <View style={styles.navbarCenter}>
          <Shimmer width={80} height={36} borderRadius={8} />
          <Shimmer width={80} height={36} borderRadius={8} />
          <Shimmer width={80} height={36} borderRadius={8} />
          <Shimmer width={80} height={36} borderRadius={8} />
        </View>
        <Shimmer width={80} height={36} borderRadius={8} />
      </View>
    );
  }
  
  return (
    <View style={styles.navbarMobile}>
      <View style={styles.navbarLeft}>
        <Shimmer width={36} height={36} borderRadius={8} />
        <Shimmer width={80} height={20} borderRadius={4} />
      </View>
      <Shimmer width={40} height={40} borderRadius={8} />
    </View>
  );
};

// Verify OTP Skeleton
export const VerifyOTPSkeleton = () => (
  <View style={styles.otpContainer}>
    <View style={styles.otpCard}>
      {/* Back button */}
      <Shimmer width={60} height={20} borderRadius={4} style={{ marginBottom: 24 }} />
      
      {/* Title */}
      <Shimmer width="70%" height={28} borderRadius={4} style={{ marginBottom: 12 }} />
      <Shimmer width="50%" height={16} borderRadius={4} style={{ marginBottom: 32 }} />
      
      {/* OTP Input boxes */}
      <View style={styles.otpRowSkeleton}>
        {[...Array(6)].map((_, i) => (
          <Shimmer key={i} width={50} height={58} borderRadius={14} />
        ))}
      </View>
      
      {/* Timer */}
      <Shimmer width={120} height={16} borderRadius={4} style={{ marginTop: 16, alignSelf: 'center' }} />
      
      {/* Verify button */}
      <Shimmer width="100%" height={48} borderRadius={14} style={{ marginTop: 24 }} />
      
      {/* Resend link */}
      <Shimmer width={100} height={16} borderRadius={4} style={{ marginTop: 16, alignSelf: 'center' }} />
    </View>
  </View>
);

// Reset Password Skeleton
export const ResetPasswordSkeleton = () => (
  <View style={styles.authContainer}>
    <View style={styles.authCard}>
      {/* Back button */}
      <Shimmer width={60} height={20} borderRadius={4} style={{ marginBottom: 24 }} />
      
      {/* Title */}
      <Shimmer width="60%" height={28} borderRadius={4} style={{ marginBottom: 12 }} />
      <Shimmer width="40%" height={16} borderRadius={4} style={{ marginBottom: 32 }} />
      
      {/* New Password field */}
      <View style={styles.formGroup}>
        <Shimmer width={100} height={14} borderRadius={4} style={{ marginBottom: 8 }} />
        <Shimmer width="100%" height={44} borderRadius={12} />
      </View>
      
      {/* Confirm Password field */}
      <View style={styles.formGroup}>
        <Shimmer width={120} height={14} borderRadius={4} style={{ marginBottom: 8 }} />
        <Shimmer width="100%" height={44} borderRadius={12} />
      </View>
      
      {/* Reset button */}
      <Shimmer width="100%" height={48} borderRadius={14} style={{ marginTop: 16 }} />
    </View>
  </View>
);

// Page Transition Skeleton (appears between route changes)
export const PageTransitionSkeleton = () => (
  <View style={styles.pageTransition}>
    <View style={styles.pageTransitionContent}>
      <Shimmer width={48} height={48} borderRadius={24} />
      <Shimmer width={160} height={24} borderRadius={4} style={{ marginTop: 16 }} />
      <Shimmer width={200} height={14} borderRadius={4} style={{ marginTop: 8 }} />
    </View>
  </View>
);

// Loading Overlay for inline loading
export const LoadingOverlay = ({ visible, transparent = false }: { visible: boolean; transparent?: boolean }) => {
  if (!visible) return null;
  
  return (
    <View style={[styles.loadingOverlay, transparent && styles.loadingOverlayTransparent]}>
      <View style={styles.loadingSpinner}>
        <Shimmer width={40} height={40} borderRadius={20} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Shimmer base styles
  shimmerContainer: {
    backgroundColor: '#e2e6f3',
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    ...Platform.select({
      web: {
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
      },
    }),
  },
  
  // Home skeleton
  homeContainer: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  homeHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  tabsSkeleton: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 12,
    gap: 12,
  },
  
  // Card skeleton
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    padding: 14,
  },
  
  // Auth skeleton
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    padding: 16,
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 420,
  },
  authCardDesktop: {
    maxWidth: 480,
    padding: 36,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  optionsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  
  // Detail skeleton
  detailContainer: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  heroSkeleton: {
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    backgroundColor: '#eef2ff',
  },
  detailContent: {
    padding: 16,
    gap: 24,
  },
  detailContentDesktop: {
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  visualColumnSkeleton: {
    flex: 1,
    gap: 16,
  },
  visualColumnSkeletonDesktop: {
    width: 380,
    flexShrink: 0,
  },
  contentColumnSkeleton: {
    flex: 1,
    gap: 16,
  },
  contentColumnSkeletonDesktop: {
    flex: 1,
  },
  sectionSkeleton: {
    marginBottom: 16,
  },
  stepSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  
  // Navbar skeleton
  navbarDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ff',
  },
  navbarMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ff',
  },
  navbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navbarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  // OTP skeleton
  otpContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    padding: 16,
  },
  otpCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 32,
    width: '100%',
    maxWidth: 430,
  },
  otpRowSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  
  // Page transition
  pageTransition: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8faff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pageTransitionContent: {
    alignItems: 'center',
  },
  
  // Loading overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingOverlayTransparent: {
    backgroundColor: 'rgba(248, 250, 255, 0.9)',
  },
  loadingSpinner: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#4c6fff',
    fontWeight: '600',
  },
});

export default Shimmer;