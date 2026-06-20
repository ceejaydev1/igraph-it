// igraph-frontend/app/(tabs)/savedDiagrams.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Rect } from 'react-native-svg';
import * as authService from '../../services/authService';

// ============================================================================
// COLORS - Matching About Us palette
// ============================================================================

const COLORS = {
  primary: '#5B6AF0',
  primaryDark: '#4A56D4',
  primaryLight: '#EEF0FF',
  secondary: '#7C5CFC',
  accent: '#F0F4FF',
  success: '#10B981',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  background: '#FBFCFE',
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  border: '#E8ECF1',
  borderLight: '#F1F5F9',
  shadow: '#0F172A',
  danger: '#ef4444',
  white: '#ffffff',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
};

const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

// ============================================================================
// BACK ICON - Matching About Us style
// ============================================================================

const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18l-6-6 6-6"
      stroke={COLORS.textPrimary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ============================================================================
// EMPTY STATE ICON
// ============================================================================

const EmptyDiagramsIcon = () => (
  <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke="#cbd5e1" strokeWidth={1.5} />
    <Path d="M8 8h8M8 12h6M8 16h4" stroke="#cbd5e1" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SavedDiagrams() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  
  const [savedDiagrams, setSavedDiagrams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isDesktop = width >= 768;
  const isMobile = width < 768;

  useEffect(() => {
    loadSavedDiagrams();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSavedDiagrams();
    setRefreshing(false);
  }, []);

  const loadSavedDiagrams = async () => {
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        router.replace('/(auth)/signin');
        return;
      }

      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://igraph-backend.onrender.com';
      const response = await fetch(`${API_URL}/api/diagrams/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const result = await response.json();
      if (result.success && result.data) {
        setSavedDiagrams(result.data);
      }
    } catch (error) {
      console.error('Failed to load diagrams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiagramPress = (diagramId: number) => {
    router.push({
      pathname: `/(tabs)/diagram/${diagramId}` as any,
    });
  };

  // Handle back navigation with fallback
  const handleBackPress = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback to user account
        router.replace('/(tabs)/userAccount');
      }
    } catch (error) {
      // If all else fails, navigate to user account
      router.replace('/(tabs)/userAccount');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - Matching About Us style */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.backButton}
          activeOpacity={0.6}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Diagrams</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          savedDiagrams.length === 0 && styles.emptyScrollContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {savedDiagrams.length === 0 ? (
          // Empty State
          <View style={styles.emptyState}>
            <EmptyDiagramsIcon />
            <Text style={styles.emptyStateTitle}>No Saved Diagrams Yet</Text>
          </View>
        ) : (
          // Diagrams Grid
          <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
            {savedDiagrams.map((diagram, index) => (
              <TouchableOpacity
                key={diagram.id || index}
                style={[
                  styles.diagramCard,
                  isDesktop && styles.diagramCardDesktop,
                  isMobile && { width: width - SPACING.xxl * 2 },
                ]}
                onPress={() => handleDiagramPress(diagram.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.cardPreview, { backgroundColor: COLORS.primaryLight }]}>
                  <EmptyDiagramsIcon />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.diagramTitle} numberOfLines={2}>
                    {diagram.title || `Diagram ${diagram.id}`}
                  </Text>
                  <View style={styles.cardMeta}>
                    <View style={[styles.typeBadge, { backgroundColor: `${COLORS.primary}15` }]}>
                      <Text style={[styles.typeText, { color: COLORS.primary }]}>
                        {diagram.type || 'UML'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header - Matching About Us style
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 36,
  },
  
  // Scroll Content
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxxl,
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xxl,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  browseButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  gridDesktop: {
    justifyContent: 'flex-start',
  },
  
  // Diagram Card
  diagramCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  diagramCardDesktop: {
    width: 280,
  },
  cardPreview: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  cardContent: {
    padding: SPACING.lg,
  },
  diagramTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});