import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import * as shareService from '@/services/diagramShareService';

const CloseIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M6 6L18 18M18 6L6 18" stroke="#64748b" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

interface RequestAccessModalProps {
  visible: boolean;
  onClose: () => void;
  diagramId: string;
  onSent: () => void;
}

export default function RequestAccessModal({ visible, onClose, diagramId, onSent }: RequestAccessModalProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  if (!visible) return null;

  const handleRequest = async () => {
    setSending(true);
    try {
      await shareService.requestAccess(diagramId, message.trim());
      setMessage('');
      onSent();
      onClose();
    } catch (e) {
      console.error('Failed to send access request:', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Request Edit Access</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <CloseIcon />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Would you like to send a customized message to the document owner?</Text>

          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder=""
            textAlignVertical="top"
          />

          <View style={styles.divider} />

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={sending}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.requestButton} onPress={handleRequest} disabled={sending}>
              <Text style={styles.requestButtonText}>{sending ? 'Sending…' : 'Request access'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    ...Platform.select({ web: { boxShadow: '0 20px 60px rgba(15,23,42,0.25)' } as any, default: {} }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    minHeight: 90,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.lg,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  requestButton: {
    backgroundColor: COLORS.gray900,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
  },
  requestButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
});