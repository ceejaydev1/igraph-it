import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { View, TouchableOpacity, Text, Platform, StyleSheet, Pressable } from 'react-native';

export type AdsterraPopupHandle = {
  show: () => void;
};

const AdsterraPopup = forwardRef<AdsterraPopupHandle>((_, ref) => {
  const [showAd, setShowAd] = useState(false);

  useImperativeHandle(ref, () => ({
    show: () => setShowAd(true),
  }));

  useEffect(() => {
    if (Platform.OS !== 'web' || !showAd) return;

    (window as any).atOptions = {
      key: '4a37788730b36cdb00728530bcada5a6',
      format: 'iframe',
      height: 250,
      width: 300,
      params: {},
    };

    const script = document.createElement('script');
    script.src = 'https://www.highrevenueformat.com/4a37788730b36cdb00728530bcada5a6/invoke.js';
    script.async = true;
    document.getElementById('ad-popup-container')?.appendChild(script);

    return () => {
      const container = document.getElementById('ad-popup-container');
      if (container) container.innerHTML = '';
    };
  }, [showAd]);

  if (Platform.OS !== 'web' || !showAd) return null;

  return (
    <Pressable style={styles.overlay} onPress={() => setShowAd(false)}>
      <Pressable style={styles.cardWrapper} onPress={(e) => e.stopPropagation()}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAd(false)}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        {/* @ts-ignore - web-only div */}
        <div id="ad-popup-container" style={{ width: 300, height: 250 }} />
      </Pressable>
    </Pressable>
  );
});

export default AdsterraPopup;

const styles = StyleSheet.create({
  overlay: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  cardWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: '#333',
    borderRadius: 12,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeText: {
    color: '#fff',
    fontSize: 13,
  },
});