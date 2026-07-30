import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Platform, Switch, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Svg, Path } from 'react-native-svg';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { Dropdown } from '@/components/properties-panel/shared';
import * as shareService from '@/services/diagramShareService';
import * as authService from '@/services/authService';

type CollaboratorPermission = 'edit_share' | 'edit' | 'view';
type LinkPermission = 'edit_share' | 'edit' | 'view';

interface CollaboratorRow {
  userId: string;
  fullName: string;
  email: string;
  permission: CollaboratorPermission | 'owner';
}

interface AccessRequestRow {
  userId: string;
  fullName: string;
  email: string;
  message: string;
  requestedAt: string;
}

interface ShareSettings {
  diagramName: string;
  myAccessLevel: string;
  owner: CollaboratorRow;
  collaborators: CollaboratorRow[];
  shareLink: { enabled: boolean; permission: LinkPermission; token: string | null };
  accessRequests: AccessRequestRow[];
}

const PERMISSION_OPTIONS: { key: CollaboratorPermission; label: string }[] = [
  { key: 'edit_share', label: 'Edit and share' },
  { key: 'edit', label: 'Edit' },
  { key: 'view', label: 'View' },
];

const CloseIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M6 6L18 18M18 6L6 18" stroke="#64748b" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const BackIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18L9 12L15 6" stroke="#1a1f36" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Matches the same email-hashed color + white-initials look used everywhere
// else a person's avatar shows (Navbar.tsx, userAccount.tsx) — this file
// duplicates it rather than importing, same as those two already do with
// each other, since neither exports its version.
const AVATAR_COLORS = ['#4c6fff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const getAvatarColor = (email: string): string => {
  if (!email) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const Avatar = ({ name, email, size = 32 }: { name: string; email: string; size?: number }) => {
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: getAvatarColor(email) },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials || '?'}</Text>
    </View>
  );
};

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  diagramId: string | null;
  diagramName: string;
}

export default function ShareModal({ visible, onClose, diagramId, diagramName }: ShareModalProps) {
  const [view, setView] = useState<'main' | 'manage'>('main');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ShareSettings | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState('');
  const [addPermission, setAddPermission] = useState<CollaboratorPermission>('edit_share');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copy link');
  const [linkBusy, setLinkBusy] = useState(false);
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null);

  // Only the owner adds/removes people or decides what the link grants.
  // edit_share can still turn the link on/off and copy it — "share the
  // link" — but doesn't get a say in who has access or at what level.
  const isOwner = settings?.myAccessLevel === 'owner';
  const canToggleLink = isOwner || settings?.myAccessLevel === 'edit_share';

  // silent=true skips the big centered spinner — used for every refresh
  // after an action (toggling the link, changing a permission, adding/
  // removing someone) so picking an option doesn't blank out the whole
  // dialog and flash a spinner over it. Only the very first load, when
  // `settings` doesn't exist yet, needs the full loading state.
  const load = async (silent = false) => {
    if (!diagramId) return;
    if (!silent) setLoading(true);
    try {
      const result = await shareService.getShareSettings(diagramId);
      if (result.success) {
        setSettings(result.data);
      }
    } catch (e) {
      console.error('Failed to load share settings:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setView('main');
    setFormError(null);
    setEmailInput('');
    setCopyLabel('Copy link');
    load();
    authService.getCurrentUserId().then(setMyUserId);
    // Reloading is intentionally tied only to the modal opening/diagram
    // changing, not every local state tweak — actions below (add/remove/
    // toggle) each refresh `settings` themselves right after they succeed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, diagramId]);

  if (!visible) return null;

  const shareUrl = (token: string) =>
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/create?share=${token}`
      : `https://igraphit.vercel.app/create?share=${token}`;

  const handleAdd = async () => {
    if (!diagramId) return;
    const email = emailInput.trim();
    if (!email) {
      setFormError('Enter an email address.');
      return;
    }
    setFormError(null);
    setAdding(true);
    try {
      const result = await shareService.addCollaborator(diagramId, email, addPermission);
      if (result.success) {
        setEmailInput('');
        await load(true);
      } else {
        setFormError(result.message || 'Could not add that person.');
      }
    } catch (e: any) {
      setFormError(e?.response?.data?.message || 'Could not add that person.');
    } finally {
      setAdding(false);
    }
  };

  const handleChangePermission = async (userId: string, permission: CollaboratorPermission) => {
    if (!diagramId) return;
    try {
      await shareService.updateCollaboratorPermission(diagramId, userId, permission);
      await load(true);
    } catch (e) {
      console.error('Failed to update permission:', e);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!diagramId) return;
    try {
      await shareService.removeCollaborator(diagramId, userId);
      await load(true);
    } catch (e) {
      console.error('Failed to remove collaborator:', e);
    }
  };

  const handleToggleLink = async (enabled: boolean) => {
    if (!diagramId) return;
    setLinkBusy(true);
    try {
      await shareService.updateShareLink(diagramId, { enabled });
      await load(true);
    } catch (e) {
      console.error('Failed to update share link:', e);
    } finally {
      setLinkBusy(false);
    }
  };

  const handleChangeLinkPermission = async (permission: LinkPermission) => {
    if (!diagramId) return;
    try {
      await shareService.updateShareLink(diagramId, { permission });
      await load(true);
    } catch (e) {
      console.error('Failed to update share link permission:', e);
    }
  };

  const handleCopyLink = async (token: string) => {
    try {
      await Clipboard.setStringAsync(shareUrl(token));
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy link'), 2000);
    } catch (e) {
      console.error('Failed to copy link:', e);
    }
  };

  const handleApproveRequest = async (userId: string) => {
    if (!diagramId) return;
    setRequestBusyId(userId);
    try {
      await shareService.approveAccessRequest(diagramId, userId, 'edit');
      await load(true);
    } catch (e) {
      console.error('Failed to approve access request:', e);
    } finally {
      setRequestBusyId(null);
    }
  };

  const handleDenyRequest = async (userId: string) => {
    if (!diagramId) return;
    setRequestBusyId(userId);
    try {
      await shareService.denyAccessRequest(diagramId, userId);
      await load(true);
    } catch (e) {
      console.error('Failed to deny access request:', e);
    } finally {
      setRequestBusyId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {!diagramId ? (
            <View style={styles.body}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>Share</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <CloseIcon />
                </TouchableOpacity>
              </View>
              <Text style={styles.emptyText}>Save this diagram first — sharing needs it to have a home.</Text>
            </View>
          ) : loading || !settings ? (
            <View style={[styles.body, styles.centerBody]}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : view === 'main' ? (
            <View style={styles.body}>
              <View style={styles.headerRow}>
                <Text style={styles.title} numberOfLines={1}>Share &quot;{diagramName}&quot;</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <CloseIcon />
                </TouchableOpacity>
              </View>

              {/* Each section below gets a descending zIndex — a Dropdown's
                  open menu is position:absolute and only extends downward,
                  but on its own that doesn't make it paint above whatever
                  comes after it in the tree (only above its own siblings).
                  Without this, the "Individual access" permission dropdown
                  opened underneath the Collaborators/Manage row instead of
                  over it. */}
              {isOwner && (
                <View style={{ zIndex: 4 }}>
                  <Text style={styles.sectionLabel}>Individual access</Text>
                  <View style={styles.addRow}>
                    <TextInput
                      style={styles.emailInput}
                      value={emailInput}
                      onChangeText={setEmailInput}
                      placeholder="Add people by email"
                      placeholderTextColor={COLORS.textTertiary}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onSubmitEditing={handleAdd}
                    />
                    <View style={styles.permissionDropdownWrap}>
                      <Dropdown
                        value={addPermission}
                        options={PERMISSION_OPTIONS}
                        onChange={(key) => setAddPermission(key as CollaboratorPermission)}
                      />
                    </View>
                  </View>
                  {formError && <Text style={styles.errorText}>{formError}</Text>}
                  <TouchableOpacity
                    style={[styles.addButton, adding && styles.addButtonDisabled]}
                    onPress={handleAdd}
                    disabled={adding}
                  >
                    <Text style={styles.addButtonText}>{adding ? 'Adding…' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isOwner && settings.accessRequests.length > 0 && (
                <View style={{ zIndex: 3 }}>
                  <Text style={styles.sectionLabel}>Access requests</Text>
                  {settings.accessRequests.map((r) => (
                    <View key={r.userId} style={styles.requestRow}>
                      <Avatar name={r.fullName} email={r.email} size={28} />
                      <View style={styles.manageRowInfo}>
                        <Text style={styles.manageRowName} numberOfLines={1}>{r.fullName}</Text>
                        {!!r.message && (
                          <Text style={styles.requestMessage} numberOfLines={2}>&quot;{r.message}&quot;</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.denyButton}
                        onPress={() => handleDenyRequest(r.userId)}
                        disabled={requestBusyId === r.userId}
                      >
                        <Text style={styles.denyButtonText}>Deny</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleApproveRequest(r.userId)}
                        disabled={requestBusyId === r.userId}
                      >
                        <Text style={styles.approveButtonText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={styles.divider} />
                </View>
              )}

              <View style={{ zIndex: 2 }}>
                <View style={styles.collaboratorsHeaderRow}>
                  <Text style={styles.sectionLabel}>Collaborators</Text>
                  {isOwner && (
                    <TouchableOpacity onPress={() => setView('manage')}>
                      <Text style={styles.manageLink}>Manage</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.avatarRow}>
                  <Avatar name={settings.owner.fullName} email={settings.owner.email} />
                  {settings.collaborators.map((c) => (
                    <Avatar key={c.userId} name={c.fullName} email={c.email} />
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={{ zIndex: 1 }}>
              <View style={styles.shareLinkHeaderRow}>
                <Text style={styles.sectionLabel}>Shareable link</Text>
                {canToggleLink && (
                  <Switch
                    value={settings.shareLink.enabled}
                    onValueChange={handleToggleLink}
                    disabled={linkBusy}
                    trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                  />
                )}
              </View>

              {settings.shareLink.enabled && settings.shareLink.token ? (
                <>
                  <View style={styles.linkRow}>
                    <View style={styles.linkTextBox}>
                      <Text style={styles.linkText} numberOfLines={1}>
                        {shareUrl(settings.shareLink.token)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => handleCopyLink(settings.shareLink.token as string)}
                    >
                      <Text style={styles.copyButtonText}>{copyLabel}</Text>
                    </TouchableOpacity>
                  </View>
                  {isOwner && (
                    <View style={styles.linkPermissionRow}>
                      <Dropdown
                        value={settings.shareLink.permission}
                        options={PERMISSION_OPTIONS}
                        onChange={(key) => handleChangeLinkPermission(key as LinkPermission)}
                      />
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.emptyText}>Turn this on to get a link anyone signed in can use to open this diagram.</Text>
              )}
              </View>
            </View>
          ) : (
            <View style={styles.body}>
              <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => setView('main')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <BackIcon />
                </TouchableOpacity>
                <Text style={styles.title}>Manage collaborators</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <CloseIcon />
                </TouchableOpacity>
              </View>

              <View style={styles.manageRow}>
                <Avatar name={settings.owner.fullName} email={settings.owner.email} size={28} />
                <View style={styles.manageRowInfo}>
                  <Text style={styles.manageRowName} numberOfLines={1}>
                    {settings.owner.fullName}
                    {settings.owner.userId === myUserId ? ' (You)' : ''}
                  </Text>
                </View>
                <Text style={styles.ownerLabel}>Owner</Text>
              </View>

              {settings.collaborators.map((c, index) => (
                <View
                  key={c.userId}
                  style={[styles.manageRow, { zIndex: settings.collaborators.length - index }]}
                >
                  <Avatar name={c.fullName} email={c.email} size={28} />
                  <View style={styles.manageRowInfo}>
                    <Text style={styles.manageRowName} numberOfLines={1}>
                      {c.fullName}
                      {c.userId === myUserId ? ' (You)' : ''}
                    </Text>
                  </View>
                  {isOwner ? (
                    <View style={styles.manageRowPermission}>
                      <Dropdown
                        value={c.permission as CollaboratorPermission}
                        options={PERMISSION_OPTIONS}
                        onChange={(key) => handleChangePermission(c.userId, key as CollaboratorPermission)}
                      />
                    </View>
                  ) : (
                    <Text style={styles.manageRowPermissionLabel}>
                      {PERMISSION_OPTIONS.find((o) => o.key === c.permission)?.label}
                    </Text>
                  )}
                  {(isOwner || c.userId === myUserId) && (
                    <TouchableOpacity
                      onPress={() => handleRemove(c.userId)}
                      style={styles.removeButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <CloseIcon />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity style={styles.doneButton} onPress={() => setView('main')}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
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
    maxWidth: 440,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    ...Platform.select({ web: { boxShadow: '0 20px 60px rgba(15,23,42,0.25)' } as any, default: {} }),
  },
  body: {
    padding: SPACING.xxl,
  },
  centerBody: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  addRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  emailInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  permissionDropdownWrap: {
    width: 150,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  requestMessage: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  denyButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  denyButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  approveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  approveButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginBottom: SPACING.sm,
  },
  addButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    marginBottom: SPACING.xl,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  collaboratorsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manageLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  avatarRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    ...Platform.select({
      web: { boxShadow: '0 1px 2px rgba(0,0,0,0.1)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
    }),
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.lg,
  },
  shareLinkHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  linkRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  linkTextBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  copyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  copyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  linkPermissionRow: {
    width: 170,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  manageRowInfo: {
    flex: 1,
    minWidth: 0,
  },
  manageRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  ownerLabel: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  manageRowPermission: {
    width: 150,
  },
  manageRowPermissionLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  removeButton: {
    padding: 2,
  },
  doneButton: {
    marginTop: SPACING.lg,
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 10,
  },
  doneButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
});