// Thin wrapper around one shared socket.io connection for real-time
// collaborative editing (see igraph-backend/services/collabSocket.js for the
// server side and the reasoning behind broadcast-based sync rather than a
// full CRDT merge). Only one diagram is ever "joined" at a time, matching
// there only ever being one Create Diagram screen open at once.
import { io } from 'socket.io-client';
import { Platform } from 'react-native';
// Deliberately the always-absolute export, not the default — Vercel's
// same-origin /api/* proxy (see constants/api.js's own comment) only covers
// plain HTTP, not a WebSocket upgrade, so this connects straight to the
// backend's real domain same as before. That does mean realtime
// collaboration can still be blocked by an in-app browser's cross-site
// cookie restrictions even after the REST/sign-in fix — a real, known gap,
// not an oversight; proxying WebSockets through Vercel reliably would be a
// separate, larger piece of work.
import { API_BASE_URL_ABSOLUTE } from '../constants/api';
import { getAccessToken } from './authService';

let socket = null;
let joinedDiagramId = null;
let remoteChangeHandler = null;
let presenceHandler = null;
let permissionChangeHandler = null;
let cellSelectHandler = null;
let resyncNeededHandler = null;

const getSocket = () => {
  if (socket) return socket;

  // Scoped to this socket instance (reset whenever disconnectCollabSocket()
  // forces a fresh one to be created later) — only a *reconnect* of an
  // already-connected socket should trigger a resync; the very first
  // connect doesn't need one, since joinDiagram's own initial call site in
  // create.tsx already loads fresh state over REST before ever joining.
  let hasConnectedOnce = false;

  socket = io(API_BASE_URL_ABSOLUTE, {
    path: '/socket.io',
    withCredentials: true, // carries the httpOnly access_token cookie on web
    // Function form (not a plain object) so every reconnect attempt reads
    // the *current* stored token — a plain object would freeze in whatever
    // token existed the moment this socket was first created, which on
    // native (15-minute access tokens, long-lived socket) would eventually
    // start failing the handshake after the first refresh.
    auth: (cb) => {
      if (Platform.OS === 'web') return cb({});
      getAccessToken().then((token) => cb({ token }));
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('diagram-change', (payload) => {
    if (remoteChangeHandler) remoteChangeHandler(payload.patches, payload.pageId, payload.fromUserId);
  });

  socket.on('presence', (viewers) => {
    if (presenceHandler) presenceHandler(viewers);
  });

  // Which shape (if any — null means deselected/left) another collaborator
  // currently has selected, so their live cursor can be shown as a colored
  // highlight around it. See collabSocket.js's cell-select relay.
  socket.on('cell-select', ({ cellId, fromUserId }) => {
    if (cellSelectHandler) cellSelectHandler(cellId, fromUserId);
  });

  // Pushed by the server the moment the owner changes this user's access
  // level (or approves their access request) — see collabSocket.js's
  // notifyPermissionChange. Only ever targets *this* socket, but still guard
  // on diagramId in case it arrives right as the user is switching diagrams.
  socket.on('permission-changed', ({ diagramId, permission }) => {
    if (permissionChangeHandler && diagramId === joinedDiagramId) permissionChangeHandler(permission);
  });

  // Room membership lives on the server-side socket instance, which is a
  // brand new one after any reconnect — rejoin whatever diagram we were
  // last in so a dropped wifi connection doesn't silently end collaboration.
  socket.on('connect', () => {
    const isReconnect = hasConnectedOnce;
    hasConnectedOnce = true;
    if (joinedDiagramId) {
      socket.emit('join-diagram', joinedDiagramId, (result) => {
        // Patches don't self-heal a message missed while disconnected the
        // way full-page snapshots used to — resync once the rejoin is
        // actually confirmed, not on every reconnect attempt regardless of
        // outcome.
        if (isReconnect && result && result.ok && resyncNeededHandler) {
          resyncNeededHandler();
        }
      });
    }
  });

  return socket;
};

// handlers.onRemoteChange(patches, pageId, fromUserId), handlers.onPresence(viewers),
// handlers.onPermissionChange(permission), handlers.onCellSelect(cellId,
// fromUserId), and handlers.onResyncNeeded() stay registered until
// joinDiagram is called again or leaveDiagram() runs.
export const joinDiagram = (diagramId, handlers = {}) => {
  remoteChangeHandler = handlers.onRemoteChange || null;
  presenceHandler = handlers.onPresence || null;
  permissionChangeHandler = handlers.onPermissionChange || null;
  cellSelectHandler = handlers.onCellSelect || null;
  resyncNeededHandler = handlers.onResyncNeeded || null;
  joinedDiagramId = diagramId;

  const s = getSocket();
  return new Promise((resolve) => {
    s.emit('join-diagram', diagramId, (result) => {
      resolve(result || { ok: false, message: 'No response from server.' });
    });
  });
};

export const leaveDiagram = () => {
  if (socket && joinedDiagramId) {
    socket.emit('leave-diagram');
  }
  joinedDiagramId = null;
  remoteChangeHandler = null;
  presenceHandler = null;
  permissionChangeHandler = null;
  cellSelectHandler = null;
  resyncNeededHandler = null;
};

// No-op if we're not currently the joined diagram's editor — callers don't
// need to re-check permission themselves before every keystroke's worth of
// autosave-debounced change. pageId identifies which page these patches
// belong to (a diagram can have several) — required so a receiving client
// on a *different* page of the same diagram doesn't apply them onto what
// it's actually looking at (see onRemoteChange's pageId guard in
// create.tsx). null/undefined is still accepted for callers that only ever
// have a single page. patches is the small change list from
// utils/diagramPatch.ts's changesToPatches, not a full-page xml snapshot —
// see that module and collabSocket.js's diagram-change handler for why.
export const sendDiagramChange = (diagramId, pageId, patches) => {
  if (!socket || joinedDiagramId !== diagramId) return;
  socket.emit('diagram-change', { patches, pageId: pageId || null });
};

// No-op if we're not currently the joined diagram's room, same as
// sendDiagramChange — but deliberately no permission check here (unlike
// that one's edit-only gate): selection is a presence signal, not an edit,
// so a view-only collaborator's pointer is just as worth showing. cellId
// null announces "deselected".
export const sendCellSelect = (diagramId, cellId) => {
  if (!socket || joinedDiagramId !== diagramId) return;
  socket.emit('cell-select', { cellId });
};

export const disconnectCollabSocket = () => {
  leaveDiagram();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};