import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';

// Handed a diagram off by app/(tabs)/create.tsx's print button, via
// sessionStorage rather than a route param — a full-resolution diagram PNG as
// a data URL easily runs past what's safe to put in a URL/query string.
// window.open() clones the opener's sessionStorage into the new tab it
// creates (per the HTML living standard), so the same key set right before
// opening this route is already there by the time this page mounts.
const PRINT_PAYLOAD_KEY = 'igraphit:print-payload';

export interface DiagramPrintPayload {
  image: string;
  width: number;
  height: number;
  name: string;
  title: string;
}

// This route exists for exactly one reason: on Android Chrome, a PDF blob
// opened via window.open() + a delayed printWindow.print() lands you in
// Chrome's own built-in PDF viewer (a separate native-ish surface), where a
// script-triggered .print() call from the opener frequently does nothing —
// the user just sees the PDF sitting there with no system print sheet.
// A plain HTML page calling window.print() on itself is the one thing every
// mobile browser reliably turns into the real OS print dialog (see the
// screenshot in the PR discussion — Chrome's native "Save as PDF / Copies /
// Paper size" sheet). This page has no app chrome of its own to worry about
// leaking into the printout (the earlier hide-siblings/@media print/iframe
// attempts on the live editor page all failed because Android's print
// pipeline snapshots the DOM as it looked *before* those late changes
// applied) — this is a fresh navigation that loads already in its final,
// print-ready state.
//
// print() is only ever called from the on-screen Print button — NOT
// automatically once the image loads. Two reasons: (1) auto-firing it meant
// the system dialog took over instantly, before the user ever actually saw
// this page, which read as the app "randomly" launching a system screen out
// of nowhere; (2) an <img> firing 'load' only means the browser has decoded
// the image, not that it's actually been painted to screen yet — calling
// print() from that event could race ahead of the paint, which is why the
// diagram sometimes showed up blank in the print preview. Waiting for a real
// tap sidesteps both: by the time the user can see this page well enough to
// press Print, the image has definitely painted.
export default function PrintScreen() {
  const [payload, setPayload] = useState<DiagramPrintPayload | null | undefined>(undefined);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Injects the one @media print rule react-native-web's style prop can't
    // express (hiding the on-screen-only toolbar) and zeroes the page margin
    // so the diagram isn't shrunk to fit inside the browser's own default
    // print margins on top of whatever margin the user's printer driver adds.
    const style = document.createElement('style');
    style.textContent = `
      @page { margin: 8mm; }
      @media print { #igraphit-print-toolbar { display: none !important; } }
    `;
    document.head.appendChild(style);

    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(PRINT_PAYLOAD_KEY);
      sessionStorage.removeItem(PRINT_PAYLOAD_KEY);
    } catch (_) {
      raw = null;
    }
    setPayload(raw ? JSON.parse(raw) : null);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const triggerPrint = () => {
    window.focus();
    window.print();
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  if (payload === undefined) {
    return <View style={styles.page} />;
  }

  if (!payload) {
    return (
      <View style={styles.page}>
        <Text style={styles.emptyText}>Nothing to print. Go back to your diagram and try again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View nativeID="igraphit-print-toolbar" style={styles.toolbar}>
        <TouchableOpacity onPress={() => window.close()} style={styles.toolbarButton}>
          <Text style={styles.toolbarButtonText}>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={triggerPrint} style={[styles.toolbarButton, styles.toolbarButtonPrimary]}>
          <Text style={[styles.toolbarButtonText, styles.toolbarButtonPrimaryText]}>Print</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sheet}>
        {(payload.name.trim() || payload.title.trim()) && (
          <View style={styles.labelRow}>
            <Text style={styles.labelName}>{payload.name.trim()}</Text>
            {!!payload.title.trim() && <Text style={styles.labelTitle}>{payload.title.trim()}</Text>}
          </View>
        )}
        {/* A real <img>, not RN's <Image> — react-native-web renders <Image>
            as a CSS background-image, and browsers omit background images/
            colors from printed output by default (Chrome's compact Android
            print sheet doesn't even expose the "Background graphics" toggle
            that would override that). An <img> is ordinary page content, so
            it prints like anything else. */}
        <img
          src={payload.image}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  toolbar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  toolbarButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  toolbarButtonPrimary: {
    backgroundColor: '#4c6fff',
  },
  toolbarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  toolbarButtonPrimaryText: {
    color: '#ffffff',
  },
  sheet: {
    width: '100%',
    maxWidth: 900,
    padding: 24,
  },
  labelRow: {
    marginBottom: 12,
    position: 'relative',
    minHeight: 24,
  },
  labelName: {
    fontSize: 13,
    color: '#1a1f36',
  },
  labelTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1f36',
  },
  emptyText: {
    marginTop: 40,
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
