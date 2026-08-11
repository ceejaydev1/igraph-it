import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

// react-native-web's <RefreshControl> is a no-op stub — it renders a plain
// <View> and silently drops onRefresh/refreshing/everything (see
// node_modules/react-native-web/src/exports/RefreshControl). Since this app
// is used as a web page in a mobile browser (not a native build), that
// means swipe-to-refresh does genuinely nothing on web today, not just
// "looks different" — there's no gesture detection to conflict with in the
// first place. This hook implements the gesture by hand for web only;
// native platforms keep using the real <RefreshControl> unaffected.

const PULL_THRESHOLD = 70; // px of drag before a release triggers onRefresh
const MAX_PULL = 100; // px the indicator can visually stretch to while dragging
const PULL_RESISTANCE = 0.5; // drag feels "heavier" than a 1:1 finger-follow

export function usePullToRefreshWeb(onRefresh: () => void | Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scrollYRef = useRef(0);
  const startYRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  const onScroll = useCallback((e: any) => {
    scrollYRef.current = e.nativeEvent?.contentOffset?.y ?? 0;
  }, []);

  const onTouchStart = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;
    const touch = e.nativeEvent?.touches?.[0];
    if (touch && scrollYRef.current <= 0) {
      startYRef.current = touch.pageY;
      draggingRef.current = true;
    } else {
      startYRef.current = null;
      draggingRef.current = false;
    }
  }, []);

  const onTouchMove = useCallback((e: any) => {
    if (Platform.OS !== 'web' || !draggingRef.current || startYRef.current == null) return;
    const touch = e.nativeEvent?.touches?.[0];
    if (!touch) return;
    const deltaY = touch.pageY - startYRef.current;
    if (deltaY > 0) {
      setPullDistance(Math.min(deltaY * PULL_RESISTANCE, MAX_PULL));
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (Platform.OS !== 'web' || !draggingRef.current) return;
    draggingRef.current = false;
    startYRef.current = null;

    setPullDistance((current) => {
      if (current >= PULL_THRESHOLD) {
        setRefreshing(true);
        Promise.resolve(onRefresh()).finally(() => {
          setRefreshing(false);
          setPullDistance(0);
        });
        return PULL_THRESHOLD * 0.7;
      }
      return 0;
    });
  }, [onRefresh]);

  return {
    pullDistance,
    refreshing,
    // Native platforms keep their real RefreshControl gesture — these
    // handlers are no-ops there (every branch above bails on
    // Platform.OS !== 'web'), so spreading them is harmless.
    scrollHandlers: { onScroll, onTouchStart, onTouchMove, onTouchEnd },
  };
}
