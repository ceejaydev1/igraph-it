// Real-time collaborative editing. One Socket.IO room per diagram
// ("diagram:<id>") — every connected client editing the same diagram gets
// every other client's changes broadcast to it, plus a live "who's here"
// presence list. Persistence to Firestore is untouched: it still happens
// through the existing REST /api/diagrams/save autosave flow on each
// client's own machine — this layer only keeps everyone's live view in
// sync between saves, the same way Google Docs' "instant" collaboration
// is really periodic saves plus a live broadcast layer, not one shared
// document being mutated transactionally by every editor at once.
//
// That's a real, deliberate trade-off: two people editing the exact same
// shape at the exact same instant can still clobber each other (last
// broadcast wins), because true conflict-free merging of a graph model
// would need a dedicated CRDT for shape/edge operations — a project in its
// own right, well beyond what a share dialog needs. In practice this is the
// same model plenty of simpler real-time tools use, and collisions are rare
// since most edits touch different shapes.

const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/generateJWT');
const { getUserById } = require('../models/userModel');
const { getAccessLevel, canView, canEdit } = require('../utils/diagramAccess');
const { db } = require('../config/firebase');

const roomName = (diagramId) => `diagram:${diagramId}`;

// Per-socket flood guard for the two high-frequency real-time events
// (diagram-change, cell-select). The frontend already debounces
// diagram-change to one send per 200ms (max 5/sec — see the setTimeout in
// app/(tabs)/create.tsx around collabSendTimerRef), so 30/sec per socket is
// generous headroom above any legitimate client while still catching a
// runaway or malicious one flooding every other collaborator in the room.
// Excess messages are silently dropped, not disconnected — a brief burst
// shouldn't kick a real user out mid-edit.
const COLLAB_MSG_LIMIT = 30;
const COLLAB_MSG_WINDOW_MS = 1000;
const withinMessageBudget = (socket) => {
  const now = Date.now();
  if (now - socket.data.msgWindowStart >= COLLAB_MSG_WINDOW_MS) {
    socket.data.msgWindowStart = now;
    socket.data.msgCount = 0;
  }
  socket.data.msgCount += 1;
  return socket.data.msgCount <= COLLAB_MSG_LIMIT;
};

// Set once attachCollabSocket runs, so notifyPermissionChange (called from
// shareController, a separate module with no other handle on this socket
// server) has something to reach live connections through.
let ioInstance = null;

// Cookies never go through a parsing library elsewhere in this backend
// (cookie-parser handles that for Express) — Socket.IO's handshake only
// hands over the raw header, so extracting just the one cookie we need is
// simpler than pulling in a whole cookie-parsing dependency for it.
const extractCookie = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map((s) => s.trim());
  const match = parts.find((s) => s.startsWith(`${name}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return match.slice(name.length + 1);
  }
};

function attachCollabSocket(httpServer, corsOriginFn) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: corsOriginFn,
      credentials: true,
    },
  });
  ioInstance = io;

  // Same two token sources REST auth accepts (see authMiddleware.protect):
  // an explicit bearer-style token for native (no ambient cookie jar there),
  // or the httpOnly access_token cookie the browser attaches automatically.
  io.use(async (socket, next) => {
    try {
      const authToken = socket.handshake.auth && socket.handshake.auth.token;
      const cookieToken = extractCookie(socket.handshake.headers.cookie, 'access_token');
      const token = authToken || cookieToken;

      if (!token) return next(new Error('unauthorized'));

      const decoded = verifyAccessToken(token);
      if (decoded.type !== 'access') return next(new Error('unauthorized'));

      const user = await getUserById(decoded.uid);
      if (!user) return next(new Error('unauthorized'));

      socket.data.userId = decoded.uid;
      socket.data.userName = user.full_name || 'Someone';
      next();
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  const broadcastPresence = (diagramId) => {
    const room = io.sockets.adapter.rooms.get(roomName(diagramId));
    const viewers = [];
    if (room) {
      for (const socketId of room) {
        const s = io.sockets.sockets.get(socketId);
        if (s) {
          viewers.push({ userId: s.data.userId, userName: s.data.userName, permission: s.data.permission });
        }
      }
    }
    io.to(roomName(diagramId)).emit('presence', viewers);
  };

  io.on('connection', (socket) => {
    socket.data.msgCount = 0;
    socket.data.msgWindowStart = Date.now();

    socket.on('join-diagram', async (diagramId, ack) => {
      try {
        if (typeof diagramId !== 'string' || !diagramId) {
          return typeof ack === 'function' && ack({ ok: false, message: 'Invalid diagram id.' });
        }

        const doc = await db.collection('diagrams').doc(diagramId).get();
        if (!doc.exists) {
          return typeof ack === 'function' && ack({ ok: false, message: 'Diagram not found.' });
        }

        const level = getAccessLevel(doc.data(), socket.data.userId);
        if (!canView(level)) {
          return typeof ack === 'function' && ack({ ok: false, message: 'No access to this diagram.' });
        }

        // A client only ever actively edits one diagram at a time — leaving
        // any previous room keeps presence/broadcasts from leaking across
        // diagrams if the user navigates from one straight to another.
        if (socket.data.diagramId && socket.data.diagramId !== diagramId) {
          const previousDiagramId = socket.data.diagramId;
          socket.leave(roomName(previousDiagramId));
          broadcastPresence(previousDiagramId);
        }

        socket.data.diagramId = diagramId;
        socket.data.permission = level;
        socket.join(roomName(diagramId));

        broadcastPresence(diagramId);
        typeof ack === 'function' && ack({ ok: true, permission: level });
      } catch (err) {
        console.error('join-diagram error:', err);
        typeof ack === 'function' && ack({ ok: false, message: 'Failed to join diagram.' });
      }
    });

    socket.on('leave-diagram', () => {
      if (!socket.data.diagramId) return;
      const diagramId = socket.data.diagramId;
      // Otherwise this user's highlight is left dangling on every other
      // client's canvas — they're gone, but the last shape they had
      // selected would keep showing their color until someone else
      // happens to select it too.
      socket.to(roomName(diagramId)).emit('cell-select', { cellId: null, fromUserId: socket.data.userId });
      socket.leave(roomName(diagramId));
      socket.data.diagramId = null;
      socket.data.permission = null;
      broadcastPresence(diagramId);
    });

    // Broadcast-only — see the file header for why this isn't a merged/CRDT
    // update. permission is re-checked per-message (not just at join time)
    // since a collaborator's access can be downgraded mid-session.
    socket.on('diagram-change', (payload) => {
      if (!withinMessageBudget(socket)) return;
      const { diagramId, permission } = socket.data;
      if (!diagramId || !canEdit(permission)) return;
      if (!payload || typeof payload.xml !== 'string') return;

      socket.to(roomName(diagramId)).emit('diagram-change', {
        xml: payload.xml,
        fromUserId: socket.data.userId,
      });
    });

    // Relays which shape (if any) this user currently has selected, so
    // every other client can highlight it in this user's color — a pure
    // presence signal, not an edit, so unlike diagram-change this isn't
    // gated on canEdit: a view-only collaborator pointing at a shape is
    // just as meaningful to show as an editor doing the same. cellId null
    // means "deselected".
    socket.on('cell-select', (payload) => {
      if (!withinMessageBudget(socket)) return;
      const { diagramId } = socket.data;
      if (!diagramId) return;
      const cellId = payload && typeof payload.cellId === 'string' ? payload.cellId : null;

      socket.to(roomName(diagramId)).emit('cell-select', {
        cellId,
        fromUserId: socket.data.userId,
      });
    });

    socket.on('disconnect', () => {
      if (socket.data.diagramId) {
        socket.to(roomName(socket.data.diagramId)).emit('cell-select', { cellId: null, fromUserId: socket.data.userId });
        broadcastPresence(socket.data.diagramId);
      }
    });
  });

  return io;
}

// Pushes a live access-level change to whichever of this user's sockets
// currently has the diagram open — collaborator permission edits and access-
// request approvals otherwise only ever reach Firestore, leaving an already-
// open tab acting on the *old* level (both its own read-only UI gating and
// this socket layer's own canEdit check in the 'diagram-change' handler
// above) until the user happens to reload. Updating socket.data.permission
// here, not just emitting the event, is what makes that socket's own edit
// checks correct immediately too, without waiting for a rejoin.
const notifyPermissionChange = (diagramId, userId, permission) => {
  if (!ioInstance) return;
  const room = ioInstance.sockets.adapter.rooms.get(roomName(diagramId));
  if (!room) return;

  let changed = false;
  for (const socketId of room) {
    const s = ioInstance.sockets.sockets.get(socketId);
    if (s && s.data.userId === userId) {
      s.data.permission = permission;
      s.emit('permission-changed', { diagramId, permission });
      changed = true;
    }
  }
  // Presence's own permission field (shown next to each viewer's name) would
  // otherwise stay stale until someone else's join/leave happens to
  // re-broadcast it.
  if (changed) {
    const viewers = [];
    for (const socketId of room) {
      const s = ioInstance.sockets.sockets.get(socketId);
      if (s) viewers.push({ userId: s.data.userId, userName: s.data.userName, permission: s.data.permission });
    }
    ioInstance.to(roomName(diagramId)).emit('presence', viewers);
  }
};

module.exports = { attachCollabSocket, notifyPermissionChange };