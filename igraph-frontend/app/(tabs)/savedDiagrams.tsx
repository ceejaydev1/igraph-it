import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  TextInput,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Rect, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../../services/authService';
import API_BASE_URL from '../../constants/api';

// ============================================================================
// COLORS
// ============================================================================

const COLORS = {
  primary: '#4c6fff',
  primaryDark: '#3b4fcc',
  primaryLight: '#eef2ff',
  secondary: '#7C5CFC',
  accent: '#F0F4FF',
  success: '#10B981',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  background: '#f8faff',
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  border: '#E8ECF1',
  borderLight: '#F1F5F9',
  shadow: '#0F172A',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
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

// ─── Type color mapping (same palette as Home; falls back for unknown types) ─
const TYPE_COLORS: Record<string, { primary: string; light: string }> = {
  UML: { primary: '#4c6fff', light: '#eef2ff' },
  SDLC: { primary: '#10b981', light: '#ecfdf5' },
  General: { primary: '#4c6fff', light: '#eef2ff' },
};

const getTypeColors = (type: string) => TYPE_COLORS[type] || TYPE_COLORS.General;

// ============================================================================
// DOT GRID PATTERN
// ============================================================================

const DotGrid = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const DOT_SPACING = 32;
  const DOT_SIZE = 1.4;

  return (
    <View style={styles.dotGridContainer} pointerEvents="none">
      <Svg width={screenWidth} height={screenHeight}>
        {Array.from({ length: Math.ceil(screenHeight / DOT_SPACING) }).map((_, row) =>
          Array.from({ length: Math.ceil(screenWidth / DOT_SPACING) }).map((_, col) => (
            <Circle
              key={`${row}-${col}`}
              cx={col * DOT_SPACING}
              cy={row * DOT_SPACING}
              r={DOT_SIZE}
              fill={COLORS.primary}
              opacity={0.12}
            />
          ))
        )}
      </Svg>
    </View>
  );
};

// ============================================================================
// ICONS
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

const EmptyDiagramsIcon = () => (
  <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke="#cbd5e1" strokeWidth={1.5} />
    <Path d="M8 8h8M8 12h6M8 16h4" stroke="#cbd5e1" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const PreviewGlyph = ({ color }: { color: string }) => (
  <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="8" height="8" rx="2" stroke={color} strokeWidth={1.6} />
    <Rect x="13" y="3" width="8" height="8" rx="2" stroke={color} strokeWidth={1.6} />
    <Rect x="8" y="13" width="8" height="8" rx="2" stroke={color} strokeWidth={1.6} />
    <Path d="M7 11V13M17 11V13M11 7H13" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const DeleteIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
      stroke="#ef4444"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const RenameIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4C3.46957 4 3.96086 4.21071 3.58579 4.58579C3.21071 4.96086 3 5.46957 3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.7893 21.0391 4.46957 22 5 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
      stroke="#4c6fff"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18.5 2.5L21.5 5.5L12 15H9V12L18.5 2.5Z"
      stroke="#4c6fff"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CloseIcon = ({ color = '#94a3b8' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const WarningIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      stroke={COLORS.danger}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ============================================================================
// RENAME MODAL
// ============================================================================

const RenameModal = ({
  visible,
  onClose,
  onRename,
  currentName,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  currentName: string;
  isLoading: boolean;
}) => {
  const [newName, setNewName] = useState(currentName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setNewName(currentName);
      setError('');
    }
  }, [visible, currentName]);

  const handleSubmit = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Diagram name cannot be empty');
      return;
    }
    if (trimmed === currentName) {
      onClose();
      return;
    }
    onRename(trimmed);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rename Diagram</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <CloseIcon />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>Enter a new name for this diagram</Text>

          <TextInput
            style={[styles.modalInput, error && styles.modalInputError]}
            value={newName}
            onChangeText={(text) => {
              setNewName(text);
              if (error) setError('');
            }}
            placeholder="Enter new diagram name"
            placeholderTextColor="#94a3b8"
            autoFocus
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
            maxLength={100}
          />

          {error ? <Text style={styles.modalErrorText}>{error}</Text> : null}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSaveButton, isLoading && styles.modalButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ============================================================================
// CONFIRM DELETE MODAL (replaces Alert.alert, which is a no-op on web)
// ============================================================================

const ConfirmDeleteModal = ({
  visible,
  onClose,
  onConfirm,
  diagramName,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  diagramName: string;
  isLoading: boolean;
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.warningIconWrap}>
                <WarningIcon />
              </View>
              <Text style={styles.modalTitle}>Delete Diagram</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} disabled={isLoading}>
              <CloseIcon />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Are you sure you want to delete "{diagramName}"? This action cannot be undone.
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalDeleteButton,
                isLoading && styles.modalButtonDisabled,
              ]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.modalSaveText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ============================================================================
// CONFIRM CONTINUE MODAL (open a saved diagram back into the editor)
// ============================================================================

const ConfirmContinueModal = ({
  visible,
  onClose,
  onConfirm,
  diagramName,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  diagramName: string;
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Continue Diagram</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <CloseIcon />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Are you sure you want to continue "{diagramName}"?
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSaveButton]}
              onPress={onConfirm}
            >
              <Text style={styles.modalSaveText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ============================================================================
// LIGHTWEIGHT TOAST (replaces Alert.alert success/error popups)
// ============================================================================

type ToastState = { message: string; type: 'success' | 'error' } | null;

const Toast = ({ toast, onHide }: { toast: ToastState; onHide: () => void }) => {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(onHide, 2800);
      return () => clearTimeout(timer);
    }
  }, [toast, onHide]);

  if (!toast) return null;

  return (
    <View
      style={[
        styles.toast,
        toast.type === 'error' ? styles.toastError : styles.toastSuccess,
      ]}
    >
      <Text style={styles.toastText}>{toast.message}</Text>
    </View>
  );
};

// ============================================================================
// ✅ SKELETON LOADER — matches Home's shimmer skeleton cards
// ============================================================================

const Shimmer = ({
  width,
  height,
  borderRadius = 8,
  style = {},
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
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

  const numericWidth = typeof width === 'number' ? width : 400;

  return (
    <View style={[styles.shimmerContainer, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX: shimmerTranslate }],
            width: numericWidth * 2,
          },
        ]}
      />
    </View>
  );
};

const SavedDiagramCardSkeleton = ({ cardWidth }: { cardWidth: number }) => {
  return (
    <View style={[styles.skeletonCardWrap, { width: cardWidth }]}>
      <View style={styles.skeletonStackedCard} />
      <View style={styles.skeletonCard}>
        <Shimmer width="100%" height={130} borderRadius={18} style={{ width: undefined }} />
        <View style={styles.skeletonCardContent}>
          <Shimmer width="80%" height={16} borderRadius={4} style={{ marginBottom: 10 }} />
          <Shimmer width="40%" height={12} borderRadius={4} />
        </View>
      </View>
    </View>
  );
};

const SavedDiagramsGridSkeleton = ({
  isDesktop,
  cardWidth,
  count,
}: {
  isDesktop: boolean;
  cardWidth: number;
  count: number;
}) => {
  return (
    <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
      {[...Array(count)].map((_, i) => (
        <View key={i} style={[styles.gridItem, { width: cardWidth }]}>
          <SavedDiagramCardSkeleton cardWidth={cardWidth} />
        </View>
      ))}
    </View>
  );
};

// ============================================================================
// ✅ SAVED DIAGRAM CARD — restyled to match Home's DiagramCard
// ============================================================================

const SavedDiagramCard = React.memo(({
  diagram,
  isDesktop,
  isDeleting,
  onPress,
  onRename,
  onDelete,
}: {
  diagram: any;
  isDesktop: boolean;
  isDeleting: boolean;
  onPress: () => void;
  onRename: () => void;
  onDelete: () => void;
}) => {
  const type = diagram.type || 'General';
  const colors = getTypeColors(type);
  const [isHovered, setIsHovered] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isHovered ? 1.015 : 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: isHovered ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isHovered]);

  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, 0.16],
  });

  const elevation = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 8],
  });

  return (
    <Pressable
      onPress={onPress}
      disabled={isDeleting}
      style={({ pressed }) => [
        styles.cardTouchable,
        pressed && styles.cardPressed,
      ]}
      // @ts-ignore - React Native Web specific props
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <View style={[styles.stackedCard, { backgroundColor: colors.light }]} />

      <Animated.View
        style={[
          styles.diagramCard,
          {
            transform: [{ scale: scaleAnim }],
            shadowOpacity,
            elevation,
          },
        ]}
      >
        <View
          style={[
            styles.cardPreview,
            isDesktop && styles.cardPreviewDesktop,
            { backgroundColor: colors.light },
          ]}
        >
          {diagram.previewImage ? (
            <Image
              source={{ uri: diagram.previewImage }}
              style={styles.cardPreviewImage}
              resizeMode="contain"
            />
          ) : (
            <PreviewGlyph color={colors.primary} />
          )}
          {isHovered && (
            <View style={[styles.hoverOverlay, { backgroundColor: colors.primary + '0F' }]} />
          )}
        </View>

        <View style={styles.cardContent}>
          <Text
            style={[styles.cardTitle, isDesktop && styles.cardTitleDesktop]}
            numberOfLines={2}
          >
            {diagram.name || `Diagram ${diagram.id}`}
          </Text>

          <View style={styles.cardFooterRow}>
            <Text style={styles.diagramDate}>
              {diagram.updated_at ? new Date(diagram.updated_at).toLocaleDateString() : ''}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Action Buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.renameButton]}
          onPress={onRename}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={isDeleting}
        >
          <RenameIcon />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton, isDeleting && styles.actionButtonDisabled]}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={COLORS.danger} />
          ) : (
            <DeleteIcon />
          )}
        </TouchableOpacity>
      </View>
    </Pressable>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SavedDiagrams() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Lazily seeded from the same in-memory cache userAccount.tsx writes to —
  // this screen and the account screen's "N saved" both otherwise start
  // empty and fetch on mount/focus, flashing "0 saved diagrams" on remount.
  const [savedDiagrams, setSavedDiagrams] = useState<any[]>(() => authService.getCachedDiagrams() ?? []);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  // ─── Rename state ──────────────────────────────────────────────────────────
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingDiagram, setRenamingDiagram] = useState<any>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  // ─── Delete state ──────────────────────────────────────────────────────────
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingDiagram, setDeletingDiagram] = useState<any>(null);

  const [continueModalVisible, setContinueModalVisible] = useState(false);
  const [continuingDiagram, setContinuingDiagram] = useState<any>(null);

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;

  const cardWidth = isMobile ? width - SPACING.xxl * 2 - SPACING.sm : isTablet ? (width - 44) / 2 : 300;

  // freezeOnBlur (see app/(tabs)/_layout.tsx) means navigating away just
  // freezes this screen instead of unmounting it, so a mount-only effect
  // never re-fires when coming back — useFocusEffect re-runs on every
  // return to this tab, matching the same fix used in userAccount.tsx.
  useFocusEffect(
    useCallback(() => {
      loadSavedDiagrams();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSavedDiagrams();
    setRefreshing(false);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const loadSavedDiagrams = async () => {
    try {
      setError(null);
      const token = await authService.getAccessToken();

      if (!token) {
        console.log('🔴 No access token found, redirecting to signin');
        router.replace('/(auth)/signin');
        return;
      }

      const API_URL = API_BASE_URL || 'https://igraph-backend.onrender.com';
      console.log(`📋 Fetching saved diagrams from: ${API_URL}/api/diagrams/user`);

      const response = await authService.authFetch(`${API_URL}/api/diagrams/user`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`📥 Response status: ${response.status}`);

      const result = await response.json();
      console.log(`📥 Response data:`, result);

      if (result.success && result.data) {
        console.log(`✅ Found ${result.data.length} saved diagrams`);
        authService.setCachedDiagrams(result.data);
        setSavedDiagrams(result.data);
      } else {
        console.warn(`⚠️ No diagrams found or API error:`, result.message);
        // Don't blank out an already-shown (cached) list over a transient
        // API error — only clear it if there was never anything to show.
        if (!authService.getCachedDiagrams()) {
          setSavedDiagrams([]);
        }
        if (result.message) {
          setError(result.message);
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to load diagrams:', error);
      setError(error.message || 'Failed to load saved diagrams');
      if (!authService.getCachedDiagrams()) {
        setSavedDiagrams([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── ✅ DELETE DIAGRAM (custom modal instead of Alert.alert) ──────────────

  const openDeleteModal = (diagram: any) => {
    if (deletingId === diagram.id) {
      console.log('⏳ Delete already in progress for this diagram');
      return;
    }
    setDeletingDiagram(diagram);
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setDeletingDiagram(null);
  };

  const confirmDeleteDiagram = async () => {
    if (!deletingDiagram) return;
    const diagram = deletingDiagram;

    try {
      setDeletingId(diagram.id);

      const token = await authService.getAccessToken();
      if (!token) {
        showToast('Please sign in again.', 'error');
        setDeletingId(null);
        setDeleteModalVisible(false);
        return;
      }

      const API_URL = API_BASE_URL || 'https://igraph-backend.onrender.com';
      const url = `${API_URL}/api/diagrams/${diagram.id}`;
      console.log(`🗑️ DELETE request to: ${url}`);
      console.log(`🗑️ Diagram ID: ${diagram.id}`);
      console.log(`🗑️ Diagram Name: ${diagram.name}`);

      const response = await authService.authFetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`📥 DELETE response status: ${response.status}`);

      let result;
      const textResponse = await response.text();
      console.log(`📥 Raw response: ${textResponse}`);

      try {
        result = JSON.parse(textResponse);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        showToast('Server returned an invalid response. Please try again.', 'error');
        setDeletingId(null);
        return;
      }

      console.log(`📥 DELETE response data:`, result);

      if (result.success) {
        setSavedDiagrams(prev => prev.filter(d => d.id !== diagram.id));
        setDeleteModalVisible(false);
        showToast(`"${diagram.name}" has been deleted.`, 'success');

        // Create screen caches the last-opened diagram locally (so it can
        // resume it across tab switches / logins) keyed by its id. If this
        // was that diagram, clear the cache — otherwise Create silently
        // resumes editing a "ghost" of a now-deleted diagram, and saving it
        // later 404s because the backend can't find that id anymore.
        try {
          const uid = await authService.getCurrentUserId();
          if (uid) {
            await AsyncStorage.removeItem(`diagram_draft_${uid}_${diagram.id}`);
            const pointerRaw = await AsyncStorage.getItem(`diagram_active_${uid}`);
            const pointer = pointerRaw ? JSON.parse(pointerRaw) : null;
            if (pointer?.diagramId === diagram.id) {
              await AsyncStorage.removeItem(`diagram_active_${uid}`);
            }
          }
        } catch (cleanupError) {
          console.warn('Could not clear local draft cache for deleted diagram:', cleanupError);
        }
      } else {
        showToast(result.message || 'Failed to delete diagram', 'error');
      }
    } catch (error: any) {
      console.error('❌ Delete error:', error);
      showToast(error.message || 'Failed to delete diagram. Please try again.', 'error');
    } finally {
      setDeletingId(null);
      setDeletingDiagram(null);
    }
  };

  // ─── RENAME DIAGRAM ────────────────────────────────────────────────────────

  const openRenameModal = (diagram: any) => {
    setRenamingDiagram(diagram);
    setRenameModalVisible(true);
  };

  const handleRename = async (newName: string) => {
    if (!renamingDiagram) return;

    setIsRenaming(true);
    try {
      const token = await authService.getAccessToken();
      if (!token) {
        showToast('Please sign in again.', 'error');
        setIsRenaming(false);
        return;
      }

      const API_URL = API_BASE_URL || 'https://igraph-backend.onrender.com';
      const url = `${API_URL}/api/diagrams/${renamingDiagram.id}`;
      console.log(`📝 PUT request to: ${url}`);
      console.log(`📝 New name: "${newName}"`);

      const response = await authService.authFetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });

      console.log(`📥 PUT response status: ${response.status}`);
      const result = await response.json();
      console.log(`📥 PUT response data:`, result);

      if (result.success) {
        setSavedDiagrams(prev =>
          prev.map(d =>
            d.id === renamingDiagram.id
              ? { ...d, name: newName, updated_at: result.data?.updated_at || d.updated_at }
              : d
          )
        );
        setRenameModalVisible(false);
        setRenamingDiagram(null);
        showToast('Diagram renamed successfully!', 'success');
      } else {
        showToast(result.message || 'Failed to rename diagram', 'error');
      }
    } catch (error: any) {
      console.error('❌ Rename error:', error);
      showToast(error.message || 'Failed to rename diagram. Please try again.', 'error');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDiagramPress = (diagram: any) => {
    setContinuingDiagram(diagram);
    setContinueModalVisible(true);
  };

  const closeContinueModal = () => {
    setContinueModalVisible(false);
    setContinuingDiagram(null);
  };

  const confirmContinueDiagram = () => {
    if (!continuingDiagram) return;
    const diagramId = continuingDiagram.id;
    closeContinueModal();
    router.navigate({
      pathname: '/(tabs)/create',
      params: { diagramId },
    });
  };

  // Handle back navigation with fallback
  const handleBackPress = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/userAccount');
      }
    } catch (error) {
      router.replace('/(tabs)/userAccount');
    }
  };

  return (
    <View style={styles.container}>
      <DotGrid />

      {/* Header */}
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

      {loading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: isDesktop ? 32 : 120 },
          ]}
        >
          <SavedDiagramsGridSkeleton
            isDesktop={isDesktop}
            cardWidth={cardWidth}
            count={isDesktop ? 9 : isTablet ? 6 : 4}
          />
        </ScrollView>
      ) : (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isDesktop ? 32 : 120 },
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
            <Text style={styles.emptyStateTitle}>
              {error ? 'Error Loading Diagrams' : 'No Saved Diagrams Yet'}
            </Text>
            <Text style={styles.emptyStateText}>
              {error || 'Create your first diagram and save it to see it here.'}
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/(tabs)/create')}
            >
              <Text style={styles.browseButtonText}>Create Diagram</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Diagrams Grid
          <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
            {savedDiagrams.map((diagram, index) => (
              <View
                key={diagram.id || index}
                style={[styles.gridItem, { width: cardWidth }]}
              >
                <SavedDiagramCard
                  diagram={diagram}
                  isDesktop={isDesktop}
                  isDeleting={deletingId === diagram.id}
                  onPress={() => handleDiagramPress(diagram)}
                  onRename={() => openRenameModal(diagram)}
                  onDelete={() => openDeleteModal(diagram)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      )}

      {/* Rename Modal */}
      <RenameModal
        visible={renameModalVisible}
        onClose={() => {
          setRenameModalVisible(false);
          setRenamingDiagram(null);
        }}
        onRename={handleRename}
        currentName={renamingDiagram?.name || ''}
        isLoading={isRenaming}
      />

      {/* Delete Confirm Modal */}
      <ConfirmDeleteModal
        visible={deleteModalVisible}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteDiagram}
        diagramName={deletingDiagram?.name || ''}
        isLoading={!!deletingDiagram && deletingId === deletingDiagram.id}
      />

      {/* Continue Diagram Confirm Modal */}
      <ConfirmContinueModal
        visible={continueModalVisible}
        onClose={closeContinueModal}
        onConfirm={confirmContinueDiagram}
        diagramName={continuingDiagram?.name || ''}
      />

      {/* Toast feedback */}
      <Toast toast={toast} onHide={() => setToast(null)} />
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
  dotGridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

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

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    // Bottom clearance is set per-screen-size where this style is used (see
    // the ScrollViews below) — Navbar floats as an absolutely-positioned bar
    // docked to the bottom on mobile/tablet, so a flat padding here isn't
    // enough; without extra room the last row of cards renders underneath it.
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

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

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  gridDesktop: {
    justifyContent: 'flex-start',
  },
  gridItem: {
    marginBottom: 4,
    alignSelf: 'center',
  },

  // ─── Card styling — matches Home's DiagramCard ───────────────────────────
  cardTouchable: {
    flex: 1,
    paddingRight: 8,
    paddingBottom: 8,
    position: 'relative',
  },
  cardPressed: {
    opacity: 0.92,
  },
  stackedCard: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 0,
    bottom: 0,
    borderRadius: 26,
  },
  diagramCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardPreview: {
    height: 130,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cardPreviewDesktop: {
    height: 150,
  },
  cardPreviewImage: {
    width: '100%',
    height: '100%',
  },
  hoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardContent: {
    paddingHorizontal: 6,
    paddingTop: 12,
    paddingBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  cardTitleDesktop: {
    fontSize: 16,
    lineHeight: 22,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  cardTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cardTypeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  diagramDate: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },

  // ─── Skeleton loader ──────────────────────────────────────────────────────
  shimmerContainer: {
    backgroundColor: COLORS.gray200,
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
  skeletonCardWrap: {
    position: 'relative',
    paddingRight: 8,
    paddingBottom: 8,
  },
  skeletonStackedCard: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 0,
    bottom: 0,
    borderRadius: 26,
    backgroundColor: COLORS.gray100,
  },
  skeletonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  skeletonCardContent: {
    paddingHorizontal: 6,
    paddingTop: 12,
    paddingBottom: 4,
  },

  cardActions: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    gap: SPACING.xs,
    zIndex: 10,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  renameButton: {
    borderColor: `${COLORS.primary}40`,
  },
  deleteButton: {
    borderColor: `${COLORS.danger}40`,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  warningIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalCloseBtn: {
    padding: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceSecondary,
    marginBottom: SPACING.sm,
  },
  modalInputError: {
    borderColor: COLORS.danger,
  },
  modalErrorText: {
    fontSize: 13,
    color: COLORS.danger,
    marginBottom: SPACING.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalCancelButton: {
    backgroundColor: COLORS.gray100,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalSaveButton: {
    backgroundColor: COLORS.primary,
  },
  modalDeleteButton: {
    backgroundColor: COLORS.danger,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },

  // ─── Toast ──────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    bottom: SPACING.xxxl,
    left: SPACING.xl,
    right: SPACING.xl,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  toastSuccess: {
    backgroundColor: COLORS.textPrimary,
  },
  toastError: {
    backgroundColor: COLORS.danger,
  },
  toastText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});