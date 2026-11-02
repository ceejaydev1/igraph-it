import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
  Pressable,
  PressableProps,
  Animated,
  ScrollView,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Svg, Path, Circle } from 'react-native-svg';
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

// Colors pinned here because the theme values for these roles don't pass WCAG AA
// (4.5:1 for text, 3:1 for control outlines). Move them into constants/theme.ts
// if you want every screen to pick them up.
const TONE = {
  brand: '#3b5bdb',
  brandDark: '#364fc7',
  label: '#334155',
  body: '#475569',
  muted: '#64748b',
  control: '#8896ab',
  danger: '#dc2626',
  success: '#047857',
};

const focusRing: any =
  Platform.OS === 'web'
    ? { outlineWidth: 2, outlineStyle: 'solid', outlineColor: TONE.brand, outlineOffset: 2 }
    : {};

const CARD_MAX_WIDTH = 440;
const COMPACT_BELOW = 380; // content width under which rows stack
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const SHARE_TITLE_ID = 'share-modal-title';
const CONFIRM_TITLE_ID = 'share-confirm-title';

const PERMISSION_OPTIONS: { key: CollaboratorPermission; label: string }[] = [
  { key: 'edit_share', label: 'Can edit and share' },
  { key: 'edit', label: 'Can edit' },
  { key: 'view', label: 'Can view' },
];

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  ...Object.fromEntries(PERMISSION_OPTIONS.map((o) => [o.key, o.label])),
};

const ROLE_HINT: Record<CollaboratorPermission, string> = {
  edit_share: 'Can edit the diagram and turn the shareable link on or off.',
  edit: 'Can edit the diagram.',
  view: 'Can open the diagram but not change it.',
};

const LINK_PHRASE: Record<LinkPermission, string> = {
  edit_share: 'edit and share',
  edit: 'edit',
  view: 'view',
};

// ─── Icons ───────────────────────────────────────────────────────────────────

const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M6 6L18 18M18 6L6 18" stroke={TONE.body} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18L9 12L15 6" stroke={COLORS.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon = ({ color = '#ffffff', size = 16 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ErrorIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={TONE.danger} strokeWidth={1.8} />
    <Path d="M12 7.5v5M12 16h.01" stroke={TONE.danger} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const SuccessIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={TONE.success} strokeWidth={1.8} />
    <Path d="M8 12l3 3 5-6" stroke={TONE.success} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Avatar ──────────────────────────────────────────────────────────────────

// Exported so create.tsx can show the same avatar in its presence indicator.
// The color is hashed from userId (create.tsx's live-collaboration layer only
// has userId), which keeps a person's avatar color and their live
// edit-highlight color identical. The prop is still called `email` for
// existing callers, but it receives a userId.
const AVATAR_COLORS = ['#4c6fff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export const getAvatarColor = (email: string): string => {
  if (!email) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// `decorative` hides the avatar from screen readers where the person's name
// is already printed next to it.
export const Avatar = ({ name, email, size = 32, decorative = false }: {
  name: string;
  email: string;
  size?: number;
  decorative?: boolean;
}) => {
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const a11yProps = decorative
    ? { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const }
    : { accessibilityRole: 'image' as const, accessibilityLabel: name || 'User' };

  return (
    <View
      {...a11yProps}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: getAvatarColor(email) },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials || '?'}</Text>
    </View>
  );
};

// ─── Small building blocks ───────────────────────────────────────────────────

type FocusPressableProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> };

// Pressable with a visible keyboard focus ring and a pressed state.
const FocusPressable = ({ style, onFocus, onBlur, disabled, ...rest }: FocusPressableProps) => {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={({ pressed }) => [style, focused && focusRing, pressed && !disabled && styles.pressed]}
    />
  );
};

const IconButton = ({ label, onPress, edge, children }: {
  label: string;
  onPress: () => void;
  edge?: 'start' | 'end';
  children: React.ReactNode;
}) => (
  <FocusPressable
    style={[styles.iconButton, edge === 'start' && styles.iconButtonStart, edge === 'end' && styles.iconButtonEnd]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    {children}
  </FocusPressable>
);

const Header = ({ title, onBack, onClose }: { title: string; onBack?: () => void; onClose: () => void }) => (
  <View style={styles.headerRow}>
    {onBack && (
      <IconButton label="Back to sharing" onPress={onBack} edge="start">
        <BackIcon />
      </IconButton>
    )}
    <Text style={styles.title} numberOfLines={1} accessibilityRole="header" nativeID={SHARE_TITLE_ID}>
      {title}
    </Text>
    <IconButton label="Close" onPress={onClose} edge="end">
      <CloseIcon />
    </IconButton>
  </View>
);

const StatusMessage = ({ tone, text }: { tone: 'error' | 'success'; text: string }) => (
  <View style={styles.statusRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
    {tone === 'error' ? <ErrorIcon /> : <SuccessIcon />}
    <Text style={tone === 'error' ? styles.errorText : styles.successText}>{text}</Text>
  </View>
);

const Toggle = ({ value, onValueChange, disabled, label }: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) => {
  const position = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(position, { toValue: value ? 1 : 0, duration: 140, useNativeDriver: true }).start();
  }, [value]);

  return (
    <FocusPressable
      style={styles.toggleTouch}
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={{ top: 0, bottom: 0, left: 8, right: 8 }}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
    >
      <View style={[styles.toggleTrack, value && styles.toggleTrackOn, disabled && styles.toggleDisabled]}>
        <Animated.View
          style={[
            styles.toggleThumb,
            { transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [2, 22] }) }] },
          ]}
        />
      </View>
    </FocusPressable>
  );
};

const Identity = ({ person, isYou, size = 32 }: { person: CollaboratorRow; isYou: boolean; size?: number }) => (
  <View style={styles.identity}>
    <Avatar name={person.fullName} email={person.userId} size={size} decorative />
    <View style={styles.rowInfo}>
      <Text style={styles.personName} numberOfLines={1}>
        {person.fullName}
        {isYou ? ' (You)' : ''}
      </Text>
      {!!person.email && (
        <Text style={styles.personEmail} numberOfLines={1}>
          {person.email}
        </Text>
      )}
    </View>
  </View>
);

const dialogProps = (labelledBy: string, role: 'dialog' | 'alertdialog' = 'dialog'): any =>
  Platform.OS === 'web'
    ? { role, 'aria-modal': true, 'aria-labelledby': labelledBy }
    : { accessibilityViewIsModal: true };

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  diagramId: string | null;
  diagramName: string;
}

export default function ShareModal({ visible, onClose, diagramId, diagramName }: ShareModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth - SPACING.lg * 2, CARD_MAX_WIDTH) - SPACING.xxl * 2;
  const compact = contentWidth < COMPACT_BELOW;

  const [view, setView] = useState<'main' | 'manage'>('main');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [settings, setSettings] = useState<ShareSettings | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [addPermission, setAddPermission] = useState<CollaboratorPermission>('edit_share');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [linkBusy, setLinkBusy] = useState(false);
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ userId: string; name: string; self: boolean } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only the owner adds or removes people and decides what the link grants.
  // edit_share can still turn the link on or off and copy it.
  const isOwner = settings?.myAccessLevel === 'owner';
  const canToggleLink = isOwner || settings?.myAccessLevel === 'edit_share';

  // `silent` skips the full-dialog spinner. Used for refreshes after an action,
  // so choosing an option doesn't blank the dialog.
  const load = async (silent = false) => {
    if (!diagramId) return;
    if (!silent) {
      setLoading(true);
      setLoadError(false);
    }
    try {
      const result = await shareService.getShareSettings(diagramId);
      if (result.success) setSettings(result.data);
      else if (!silent) setLoadError(true);
    } catch (e) {
      console.error('Failed to load share settings:', e);
      if (!silent) setLoadError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setView('main');
    setFormError(null);
    setAddSuccess(null);
    setNotice(null);
    setAnnouncement('');
    setEmailInput('');
    setCopyState('idle');
    setConfirmRemove(null);
    load();
    authService.getCurrentUserId().then(setMyUserId);
    // Reload only when the modal opens or the diagram changes. Every action
    // below refreshes `settings` itself after it succeeds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, diagramId]);

  useEffect(
    () => () => {
      if (successTimer.current) clearTimeout(successTimer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  if (!visible) return null;

  const shareUrl = (token: string) =>
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/create?share=${token}`
      : `https://igraphit.vercel.app/create?share=${token}`;

  // Runs a service call, refreshes settings, and surfaces a message if it fails.
  const attempt = async (action: () => Promise<unknown>, failureMessage: string) => {
    setNotice(null);
    try {
      await action();
      await load(true);
      return true;
    } catch (e) {
      console.error(failureMessage, e);
      setNotice(failureMessage);
      return false;
    }
  };

  const handleAdd = async () => {
    if (!diagramId || adding) return;
    const email = emailInput.trim();

    if (!email) {
      setFormError('Enter an email address.');
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setFormError('Enter a valid email address.');
      return;
    }
    const alreadyHasAccess = [settings?.owner, ...(settings?.collaborators ?? [])].some(
      (p) => p?.email?.toLowerCase() === email.toLowerCase()
    );
    if (alreadyHasAccess) {
      setFormError('That person already has access.');
      return;
    }

    setFormError(null);
    setAddSuccess(null);
    setAdding(true);
    try {
      const result = await shareService.addCollaborator(diagramId, email, addPermission);
      if (result.success) {
        setEmailInput('');
        await load(true);
        setAddSuccess(`Added ${email}`);
        if (successTimer.current) clearTimeout(successTimer.current);
        successTimer.current = setTimeout(() => setAddSuccess(null), 3000);
      } else {
        setFormError(result.message || 'Could not add that person.');
      }
    } catch (e: any) {
      setFormError(e?.response?.data?.message || 'Could not add that person.');
    } finally {
      setAdding(false);
    }
  };

  const handleChangePermission = (userId: string, permission: CollaboratorPermission) => {
    if (!diagramId) return;
    attempt(
      () => shareService.updateCollaboratorPermission(diagramId, userId, permission),
      "Couldn't change that permission. Try again."
    );
  };

  const handleRemove = (userId: string, name: string) => {
    setConfirmRemove({ userId, name, self: userId === myUserId });
  };

  const confirmRemoveCollaborator = async () => {
    if (!diagramId || !confirmRemove) return;
    setRemoving(true);
    const ok = await attempt(
      () => shareService.removeCollaborator(diagramId, confirmRemove.userId),
      "Couldn't remove that person. Try again."
    );
    if (ok) setConfirmRemove(null);
    setRemoving(false);
  };

  const handleToggleLink = async (enabled: boolean) => {
    if (!diagramId) return;
    setLinkBusy(true);
    const ok = await attempt(
      () => shareService.updateShareLink(diagramId, { enabled }),
      `Couldn't turn the link ${enabled ? 'on' : 'off'}. Try again.`
    );
    if (ok) setAnnouncement(`Shareable link turned ${enabled ? 'on' : 'off'}`);
    setLinkBusy(false);
  };

  const handleChangeLinkPermission = (permission: LinkPermission) => {
    if (!diagramId) return;
    attempt(
      () => shareService.updateShareLink(diagramId, { permission }),
      "Couldn't change the link's access. Try again."
    );
  };

  const handleCopyLink = async (token: string) => {
    try {
      await Clipboard.setStringAsync(shareUrl(token));
      setCopyState('copied');
      setAnnouncement('Link copied to clipboard');
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopyState('idle'), 2000);
    } catch (e) {
      console.error('Failed to copy link:', e);
      setNotice("Couldn't copy the link. Select it and copy it manually.");
    }
  };

  const handleApproveRequest = async (userId: string) => {
    if (!diagramId) return;
    setRequestBusyId(userId);
    await attempt(
      () => shareService.approveAccessRequest(diagramId, userId, 'edit'),
      "Couldn't approve that request. Try again."
    );
    setRequestBusyId(null);
  };

  const handleDenyRequest = async (userId: string) => {
    if (!diagramId) return;
    setRequestBusyId(userId);
    await attempt(
      () => shareService.denyAccessRequest(diagramId, userId),
      "Couldn't deny that request. Try again."
    );
    setRequestBusyId(null);
  };

  // ─── Pieces of the main view ───────────────────────────────────────────────

  const renderAddForm = () => {
    const emailField = (
      <TextInput
        style={[
          styles.emailInput,
          !compact && styles.emailInputWide,
          emailFocused && styles.emailInputFocused,
          emailFocused && focusRing,
          !!formError && styles.emailInputError,
        ]}
        value={emailInput}
        onChangeText={(text) => {
          setEmailInput(text);
          if (formError) setFormError(null);
          if (addSuccess) setAddSuccess(null);
        }}
        onFocus={() => setEmailFocused(true)}
        onBlur={() => setEmailFocused(false)}
        placeholder="Add people by email"
        placeholderTextColor={TONE.muted}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="done"
        onSubmitEditing={handleAdd}
        accessibilityLabel="Add people by email"
        accessibilityHint="Enter the email address of the person to share with"
      />
    );

    const roleField = (
      <View style={compact ? styles.roleFieldCompact : styles.roleFieldWide}>
        <Dropdown
          value={addPermission}
          options={PERMISSION_OPTIONS}
          onChange={(key) => setAddPermission(key as CollaboratorPermission)}
        />
      </View>
    );

    const addButton = (
      <FocusPressable
        style={[styles.primaryButton, styles.addButton, adding && styles.buttonBusy]}
        onPress={handleAdd}
        disabled={adding}
        accessibilityRole="button"
        accessibilityLabel={adding ? 'Adding person' : 'Add person'}
        accessibilityState={{ disabled: adding, busy: adding }}
      >
        {adding ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator color="#ffffff" size="small" />
            <Text style={[styles.primaryButtonText, { marginLeft: SPACING.sm }]}>Adding…</Text>
          </View>
        ) : (
          <Text style={styles.primaryButtonText}>Add</Text>
        )}
      </FocusPressable>
    );

    return compact ? (
      <>
        {emailField}
        <View style={[styles.addRow, styles.addRowCompact]}>
          {roleField}
          {addButton}
        </View>
      </>
    ) : (
      <View style={styles.addRow}>
        {emailField}
        {roleField}
        {addButton}
      </View>
    );
  };

  const renderLinkSection = (current: ShareSettings) => {
    const { enabled, token, permission } = current.shareLink;
    return (
      <>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel} accessibilityRole="header">Shareable link</Text>
          <View style={styles.toggleGroup}>
            <Text style={[styles.toggleStatus, enabled && styles.toggleStatusOn]}>{enabled ? 'On' : 'Off'}</Text>
            {canToggleLink && (
              <Toggle value={enabled} onValueChange={handleToggleLink} disabled={linkBusy} label="Shareable link" />
            )}
          </View>
        </View>

        {enabled && token ? (
          <>
            <View style={styles.linkRow}>
              <View style={styles.linkTextBox}>
                <Text style={styles.urlText} numberOfLines={1} selectable>
                  {shareUrl(token)}
                </Text>
              </View>
              <FocusPressable
                style={[styles.primaryButton, styles.copyButton]}
                onPress={() => handleCopyLink(token)}
                accessibilityRole="button"
                accessibilityLabel={copyState === 'copied' ? 'Link copied' : 'Copy link'}
              >
                <View style={styles.buttonContent}>
                  {copyState === 'copied' && <CheckIcon />}
                  <Text style={[styles.primaryButtonText, copyState === 'copied' && { marginLeft: 6 }]}>
                    {copyState === 'copied' ? 'Link copied' : 'Copy link'}
                  </Text>
                </View>
              </FocusPressable>
            </View>

            {isOwner ? (
              <View style={styles.linkAccess}>
                <Text style={styles.hintText}>Anyone signed in with the link</Text>
                <View style={compact ? styles.linkDropdownCompact : styles.linkDropdownWide}>
                  <Dropdown
                    value={permission}
                    options={PERMISSION_OPTIONS}
                    onChange={(key) => handleChangeLinkPermission(key as LinkPermission)}
                  />
                </View>
              </View>
            ) : (
              <Text style={styles.hintText}>Anyone signed in with the link can {LINK_PHRASE[permission]}.</Text>
            )}
          </>
        ) : (
          <Text style={styles.descriptionText}>
            Turn this on to get a link anyone signed in can use to open this diagram.
          </Text>
        )}
      </>
    );
  };

  // ─── Pieces of the manage view ─────────────────────────────────────────────

  const renderManageRow = (c: CollaboratorRow, index: number) => {
    const isYou = c.userId === myUserId;
    const canRemove = isOwner || isYou;
    const removeButton = canRemove ? (
      <IconButton
        label={isYou ? 'Leave this diagram' : `Remove ${c.fullName}`}
        onPress={() => handleRemove(c.userId, isYou ? 'yourself' : c.fullName)}
        edge="end"
      >
        <CloseIcon />
      </IconButton>
    ) : null;

    const permissionControl = isOwner ? (
      <View style={compact ? styles.permissionCompact : styles.permissionWide}>
        <Dropdown
          value={c.permission as CollaboratorPermission}
          options={PERMISSION_OPTIONS}
          onChange={(key) => handleChangePermission(c.userId, key as CollaboratorPermission)}
        />
      </View>
    ) : (
      <Text style={styles.roleText}>{ROLE_LABEL[c.permission]}</Text>
    );

    // Each row gets a descending zIndex so an open Dropdown menu paints over
    // the rows below it.
    const stacking = { zIndex: settings!.collaborators.length - index };

    return compact ? (
      <View key={c.userId} style={[styles.manageBlock, stacking]}>
        <View style={styles.personRow}>
          <Identity person={c} isYou={isYou} size={28} />
          {removeButton}
        </View>
        {permissionControl}
      </View>
    ) : (
      <View key={c.userId} style={[styles.personRow, stacking]}>
        <Identity person={c} isYou={isYou} size={28} />
        {permissionControl}
        {removeButton}
      </View>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const renderBody = () => {
    if (!diagramId) {
      return (
        <View style={styles.body}>
          <Header title="Share" onClose={onClose} />
          <Text style={styles.descriptionText}>Save this diagram first, then you can share it.</Text>
        </View>
      );
    }

    if (loadError) {
      return (
        <View style={styles.body}>
          <Header title="Share" onClose={onClose} />
          <StatusMessage tone="error" text="Couldn't load the sharing settings." />
          <FocusPressable
            style={[styles.primaryButton, styles.retryButton]}
            onPress={() => load()}
            accessibilityRole="button"
            accessibilityLabel="Try loading sharing settings again"
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </FocusPressable>
        </View>
      );
    }

    if (loading || !settings) {
      return (
        <View style={styles.body}>
          <Header title="Share" onClose={onClose} />
          <View style={styles.centerBody}>
            <ActivityIndicator color={TONE.brand} accessibilityLabel="Loading sharing settings" />
          </View>
        </View>
      );
    }

    if (view === 'manage') {
      return (
        <View style={styles.body}>
          <Header title="Manage collaborators" onBack={() => setView('main')} onClose={onClose} />
          {notice && <StatusMessage tone="error" text={notice} />}

          <View style={styles.personRow}>
            <Identity person={settings.owner} isYou={settings.owner.userId === myUserId} size={28} />
            <Text style={styles.roleText}>Owner</Text>
          </View>

          {settings.collaborators.map(renderManageRow)}

          <FocusPressable
            style={[styles.primaryButton, styles.doneButton]}
            onPress={() => setView('main')}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </FocusPressable>
        </View>
      );
    }

    return (
      <View style={styles.body}>
        <Header title={`Share "${diagramName}"`} onClose={onClose} />
        {notice && <StatusMessage tone="error" text={notice} />}

        {/* Sections get descending zIndex values so an open Dropdown menu
            (absolutely positioned, extends downward) paints over the section
            below it instead of underneath. */}
        {isOwner && (
          <View style={[styles.section, { zIndex: 4 }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel} accessibilityRole="header">Individual access</Text>
            </View>
            {renderAddForm()}
            <Text style={styles.hintText}>{ROLE_HINT[addPermission]}</Text>
            {formError && <StatusMessage tone="error" text={formError} />}
            {addSuccess && <StatusMessage tone="success" text={addSuccess} />}
          </View>
        )}

        {isOwner && settings.accessRequests.length > 0 && (
          <View style={[styles.section, { zIndex: 3 }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel} accessibilityRole="header">Access requests</Text>
            </View>
            {settings.accessRequests.map((r) => {
              const busy = requestBusyId === r.userId;
              return (
                <View key={r.userId} style={styles.requestRow}>
                  <View style={styles.requestIdentity}>
                    <Avatar name={r.fullName} email={r.userId} size={28} decorative />
                    <View style={styles.rowInfo}>
                      <Text style={styles.personName} numberOfLines={1}>{r.fullName}</Text>
                      {!!r.message && (
                        <Text style={styles.requestMessage} numberOfLines={2}>&quot;{r.message}&quot;</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <FocusPressable
                      style={[styles.secondaryButton, busy && styles.buttonBusy]}
                      onPress={() => handleDenyRequest(r.userId)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={`Deny ${r.fullName}`}
                    >
                      <Text style={styles.secondaryButtonText}>Deny</Text>
                    </FocusPressable>
                    <FocusPressable
                      style={[styles.primaryButton, styles.smallButton, busy && styles.buttonBusy]}
                      onPress={() => handleApproveRequest(r.userId)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={`Approve ${r.fullName}`}
                      accessibilityHint="Gives them edit access"
                    >
                      <Text style={styles.primaryButtonText}>Approve</Text>
                    </FocusPressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={[styles.section, { zIndex: 2 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel} accessibilityRole="header">Collaborators</Text>
            {isOwner && (
              <FocusPressable
                style={styles.textButton}
                onPress={() => setView('manage')}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Manage collaborators"
              >
                <Text style={styles.linkText}>Manage</Text>
              </FocusPressable>
            )}
          </View>
          <ScrollView style={styles.peopleList} nestedScrollEnabled>
            <View style={styles.personRow}>
              <Identity person={settings.owner} isYou={settings.owner.userId === myUserId} />
              <Text style={styles.roleText}>Owner</Text>
            </View>
            {settings.collaborators.map((c) => (
              <View key={c.userId} style={styles.personRow}>
                <Identity person={c} isYou={c.userId === myUserId} />
                <Text style={styles.roleText}>{ROLE_LABEL[c.permission]}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.divider} />

        <View style={{ zIndex: 1 }}>{renderLinkSection(settings)}</View>
      </View>
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.card} {...dialogProps(SHARE_TITLE_ID)}>
            {renderBody()}
            <Text style={styles.srOnly} accessibilityLiveRegion="polite">{announcement}</Text>
          </View>
        </View>
      </Modal>

      {confirmRemove && (
        <Modal visible transparent animationType="fade" onRequestClose={() => (removing ? null : setConfirmRemove(null))}>
          <View style={styles.overlay}>
            <View style={styles.confirmCard} {...dialogProps(CONFIRM_TITLE_ID, 'alertdialog')}>
              <Text style={styles.confirmTitle} accessibilityRole="header" nativeID={CONFIRM_TITLE_ID}>
                {confirmRemove.self ? 'Leave this diagram?' : `Remove ${confirmRemove.name}?`}
              </Text>
              <Text style={styles.confirmMessage}>
                {confirmRemove.self
                  ? "You'll lose access immediately and need a new invite to get back in."
                  : `${confirmRemove.name} will lose access immediately and need a new invite to get back in.`}
              </Text>
              {notice && <StatusMessage tone="error" text={notice} />}
              <View style={styles.confirmActions}>
                <FocusPressable
                  style={styles.secondaryButton}
                  onPress={() => setConfirmRemove(null)}
                  disabled={removing}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </FocusPressable>
                <FocusPressable
                  style={[styles.dangerButton, removing && styles.buttonBusy]}
                  onPress={confirmRemoveCollaborator}
                  disabled={removing}
                  accessibilityRole="button"
                  accessibilityState={{ busy: removing }}
                >
                  <Text style={styles.primaryButtonText}>
                    {removing ? 'Removing…' : confirmRemove.self ? 'Leave' : 'Remove'}
                  </Text>
                </FocusPressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
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
    maxWidth: CARD_MAX_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    ...Platform.select({ web: { boxShadow: '0 20px 60px rgba(15,23,42,0.25)' } as any, default: {} }),
  },
  body: {
    padding: SPACING.xxl,
  },
  centerBody: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  iconButtonStart: { marginLeft: -12 },
  iconButtonEnd: { marginRight: -12 },

  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
    marginBottom: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TONE.label,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
    color: TONE.muted,
    marginTop: SPACING.sm,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: TONE.body,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.lg,
  },

  // Add-person form
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    position: 'relative',
    zIndex: 2,
  },
  addRowCompact: {
    marginTop: SPACING.sm,
  },
  emailInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: TONE.control,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  emailInputWide: { flex: 1, minWidth: 0 },
  emailInputFocused: { borderColor: TONE.brand },
  emailInputError: { borderColor: TONE.danger },
  roleFieldWide: { width: 170 },
  roleFieldCompact: { flex: 1, minWidth: 0 },

  // Buttons
  primaryButton: {
    minHeight: 44,
    backgroundColor: TONE.brand,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  addButton: { minWidth: 72 },
  smallButton: { paddingHorizontal: SPACING.md },
  retryButton: { alignSelf: 'flex-start', marginTop: SPACING.md },
  buttonBusy: { opacity: 0.7 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  secondaryButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: TONE.control,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: TONE.label,
    fontWeight: '600',
    fontSize: 14,
  },
  dangerButton: {
    minHeight: 44,
    backgroundColor: TONE.danger,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButton: {
    minHeight: 28,
    justifyContent: 'center',
    borderRadius: 6,
  },
  linkText: {
    color: TONE.brand,
    fontSize: 14,
    fontWeight: '600',
  },

  // Status messages
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  errorText: { flexShrink: 1, fontSize: 13, lineHeight: 18, color: TONE.danger, fontWeight: '500' },
  successText: { flexShrink: 1, fontSize: 13, lineHeight: 18, color: TONE.success, fontWeight: '500' },

  // People
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 52,
    paddingVertical: 4,
    position: 'relative',
  },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rowInfo: { flex: 1, minWidth: 0 },
  personName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  personEmail: { fontSize: 13, color: TONE.muted, marginTop: 1 },
  roleText: { fontSize: 13, color: TONE.body },
  peopleList: { maxHeight: 208 },
  manageBlock: { paddingBottom: SPACING.sm, position: 'relative' },
  permissionWide: { width: 180 },
  permissionCompact: { width: '100%' },

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

  // Access requests (wraps onto a second line on narrow screens)
  requestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  requestIdentity: {
    flex: 1,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  requestActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginLeft: 'auto',
  },
  requestMessage: {
    fontSize: 13,
    color: TONE.body,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Shareable link
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toggleStatus: { fontSize: 13, fontWeight: '600', color: TONE.muted },
  toggleStatusOn: { color: TONE.brand },
  toggleTouch: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 14,
  },
  toggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: TONE.control,
    justifyContent: 'center',
  },
  toggleTrackOn: { backgroundColor: TONE.brand },
  toggleDisabled: { opacity: 0.6 },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(15,23,42,0.35)' } as any,
      default: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
      },
    }),
  },
  linkRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  linkTextBox: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderColor: TONE.control,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  urlText: {
    fontSize: 14,
    color: TONE.body,
  },
  copyButton: { minWidth: 112 },
  linkAccess: { position: 'relative' },
  linkDropdownWide: { width: 200, marginTop: SPACING.sm },
  linkDropdownCompact: { width: '100%', marginTop: SPACING.sm },

  doneButton: {
    marginTop: SPACING.lg,
    alignSelf: 'flex-end',
    paddingHorizontal: SPACING.xl,
  },

  // Remove confirmation
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    ...Platform.select({ web: { boxShadow: '0 20px 60px rgba(15,23,42,0.25)' } as any, default: {} }),
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  confirmMessage: {
    fontSize: 14,
    color: TONE.body,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
});