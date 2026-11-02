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
// The user already expressed clear intent to print by clicking Print on the
// previous screen (see executePrint in create.tsx) — this page opening at
// all IS that action, so making them click a second "Print" button just to
// reach the OS dialog is a redundant extra step. print() is now called
// automatically once the diagram image has actually painted, via nested
// requestAnimationFrame calls (see handleImageLoad below) — the <img>
// 'load' event alone only means the browser has decoded the pixels, not
// that they've reached the screen yet, which is why the diagram used to
// sometimes print blank when print() fired too early. The on-screen Print
// button stays as a manual fallback (e.g. to reprint after dismissing the
// dialog), it's just no longer the only way to reach it.
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
      @page {
        /* Fixed to Letter so this matches the physical dimensions used
           below — the user's print dialog can still override paper size,
           but our own fit-to-page math needs one fixed target to compute
           against. margin stays 8mm, same as before. */
        size: 8.5in 11in;
        margin: 8mm;
      }
      @media print {
        #igraphit-print-toolbar { display: none !important; }
        /* The label row (name/title) sits ABOVE the image — giving the
           image its own full-page frame (the previous attempt) still
           overflowed once the label's height was added on top of it,
           spilling onto a 2nd sheet. This instead makes the label row +
           image share ONE fixed-height page box: the sheet becomes a
           column flexbox pinned to the exact printable page size, the
           label keeps its natural height, and the image gets whatever
           space is left via flex. min-height: 0 is required — flex items
           default to min-height: auto, which lets a replaced element
           (img) refuse to shrink below its intrinsic size regardless of
           max-height, silently reproducing the same overflow.
        */
        #igraphit-print-sheet {
          display: flex !important;
          flex-direction: column !important;
          width: calc(8.5in - 16mm) !important;
          height: calc(11in - 16mm) !important;
          max-width: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        #igraphit-print-image {
          flex: 1 1 auto !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          max-width: 100% !important;
          max-height: 100% !important;
          object-fit: contain !important;
        }
      }
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

  // Guards against calling triggerPrint twice — both the ref callback below
  // (if the image is already complete by the time it runs) and the onLoad
  // handler (the normal case) can each independently decide to fire this.
  const hasAutoPrintedRef = React.useRef(false);
  const handleImageLoad = () => {
    if (hasAutoPrintedRef.current) return;
    hasAutoPrintedRef.current = true;

    // A single requestAnimationFrame fires before the NEXT frame paints —
    // not necessarily after the frame containing the just-loaded image has
    // painted, since 'load' can fire mid-frame. Nesting two guarantees a
    // full paint cycle has actually completed: the outer rAF runs at the
    // start of the next frame (before THAT frame paints), and the inner one
    // only runs once that frame has painted and the browser is about to
    // start the one after it. That's what makes it safe to hand off to
    // window.print() here without risking the blank-print race.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        triggerPrint();
      });
    });
  };

  // <img> onLoad is unreliable for a data: URL specifically: decoding a
  // data URI can be fully synchronous, so the 'load' event can fire the
  // instant the src attribute is set on the DOM node — which happens
  // during React's commit, potentially before React has finished attaching
  // the onLoad listener passed as a prop. When that race is lost, onLoad
  // below never fires at all, and the auto-print silently never happens
  // (the manual Print button still works, since it doesn't depend on this).
  // This ref callback runs the instant the <img> DOM node is created/
  // attached, so checking img.complete here catches exactly that case —
  // if the browser already finished decoding by then, .complete is already
  // true and this fires handleImageLoad directly instead of waiting on an
  // event that already happened.
  const printImageRef = (img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth > 0) {
      handleImageLoad();
    }
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

      <View nativeID="igraphit-print-sheet" style={styles.sheet}>
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
          id="igraphit-print-image"
          ref={printImageRef}
          src={payload.image}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onLoad={handleImageLoad}
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