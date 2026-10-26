import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

interface UserProfile {
  userId: string;
  displayName: string;
  avatar: string;
  publicKey: any; // JWK ECDH public key
  lastSeen: number;
  createdAt: number;
}

interface GroupChat {
  id: string;
  name: string;
  avatar: string;
  members: string[]; // userIds
  createdBy: string;
  createdAt: number;
}

type MessageType = 'text' | 'image' | 'video' | 'audio';
type AudioPitchEffect = 'normal' | 'high' | 'low';

interface EncryptedMessage {
  id: string;
  senderId: string;
  recipientId: string; // userId or groupId
  groupId?: string;
  encryptedPayload: string;
  messageType: MessageType;
  audioEffect?: AudioPitchEffect;
  audioDuration?: number;
  viewOnce?: boolean;
  viewed?: boolean;
  viewedBy?: string[];
  viewedAt?: number;
  createdAt: number;
  expiresAt: number; // Max 24 hours
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '30mb' }));

// Persistence directories
const DATA_DIR = path.resolve(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let users: Map<string, UserProfile> = new Map();
let groups: Map<string, GroupChat> = new Map();
let messages: EncryptedMessage[] = [];

// Load persisted data
try {
  if (fs.existsSync(USERS_FILE)) {
    const rawUsers: UserProfile[] = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    users = new Map(rawUsers.map((u) => [u.userId.toLowerCase(), u]));
  }
} catch (e) {
  console.warn('Could not load users file:', e);
}

try {
  if (fs.existsSync(GROUPS_FILE)) {
    const rawGroups: GroupChat[] = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf-8'));
    groups = new Map(rawGroups.map((g) => [g.id, g]));
  }
} catch (e) {
  console.warn('Could not load groups file:', e);
}

try {
  if (fs.existsSync(MESSAGES_FILE)) {
    const rawMessages: EncryptedMessage[] = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
    const now = Date.now();
    messages = rawMessages.filter((m) => m.expiresAt > now);
  }
} catch (e) {
  console.warn('Could not load messages file:', e);
}

function persistData() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(Array.from(users.values()), null, 2));
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(Array.from(groups.values()), null, 2));
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
  } catch (err) {
    console.error('Error persisting data:', err);
  }
}

// Purge messages strictly older than 24h
function purgeExpiredMessages() {
  const now = Date.now();
  const initialCount = messages.length;
  messages = messages.filter((m) => m.expiresAt > now);
  if (messages.length !== initialCount) {
    persistData();
    broadcastEvent({ type: 'purge', timestamp: now });
  }
}

setInterval(purgeExpiredMessages, 20 * 1000);

// SSE connection pool
type ClientSubscriber = {
  userId: string;
  res: Response;
};

let clients: ClientSubscriber[] = [];

function broadcastEvent(data: any, targetUserId?: string) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((c) => {
    if (!targetUserId || c.userId.toLowerCase() === targetUserId.toLowerCase()) {
      try {
        c.res.write(payload);
      } catch {
        // Disconnect handled
      }
    }
  });
}

function broadcastToGroup(groupId: string, data: any) {
  const group = groups.get(groupId);
  if (!group) return;
  group.members.forEach((memberId) => {
    broadcastEvent(data, memberId);
  });
}

// 1. Health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeUsers: users.size,
    activeGroups: groups.size,
    activeMessages: messages.length,
    timestamp: Date.now(),
  });
});

// 2. SSE Stream
app.get('/api/events', (req: Request, res: Response) => {
  const userId = (req.query.userId as string)?.trim()?.toLowerCase();
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const client: ClientSubscriber = { userId, res };
  clients.push(client);

  const existingUser = users.get(userId);
  if (existingUser) {
    existingUser.lastSeen = Date.now();
    users.set(userId, existingUser);
  }

  res.write(`data: ${JSON.stringify({ type: 'connected', userId, time: Date.now() })}\n\n`);

  req.on('close', () => {
    clients = clients.filter((c) => c !== client);
  });
});

// 3. User Register & Profile
app.post('/api/users', (req: Request, res: Response) => {
  const { userId, displayName, avatar, publicKey } = req.body;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'ID utente valido richiesto' });
    return;
  }

  const cleanId = userId.trim().toLowerCase();
  const existing = users.get(cleanId);
  const now = Date.now();

  const profile: UserProfile = {
    userId: cleanId,
    displayName: (displayName || cleanId).trim(),
    avatar: avatar || existing?.avatar || '',
    publicKey: publicKey || existing?.publicKey || null,
    lastSeen: now,
    createdAt: existing?.createdAt || now,
  };

  users.set(cleanId, profile);
  persistData();

  broadcastEvent({ type: 'user_updated', user: profile });
  res.json({ success: true, user: profile });
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const cleanId = req.params.id.trim().toLowerCase();
  const user = users.get(cleanId);

  if (!user) {
    res.status(404).json({ error: 'Utente non trovato' });
    return;
  }
  res.json({ user });
});

app.get('/api/users', (req: Request, res: Response) => {
  const query = (req.query.q as string)?.toLowerCase()?.trim();
  const allUsers = Array.from(users.values());

  if (!query) {
    const sorted = allUsers.sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 50);
    res.json({ users: sorted });
    return;
  }

  const filtered = allUsers
    .filter((u) => u.userId.includes(query) || u.displayName.toLowerCase().includes(query))
    .slice(0, 30);
  res.json({ users: filtered });
});

// ============================================
// 4. GROUP CHATS API
// ============================================
app.post('/api/groups', (req: Request, res: Response) => {
  const { name, avatar, members, createdBy } = req.body;

  if (!name || typeof name !== 'string' || !createdBy) {
    res.status(400).json({ error: 'Nome gruppo e creatore richiesti' });
    return;
  }

  const cleanCreator = createdBy.trim().toLowerCase();
  const cleanMembers = Array.isArray(members)
    ? Array.from(new Set([cleanCreator, ...members.map((m: string) => m.trim().toLowerCase())]))
    : [cleanCreator];

  const groupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const newGroup: GroupChat = {
    id: groupId,
    name: name.trim(),
    avatar: avatar || '',
    members: cleanMembers,
    createdBy: cleanCreator,
    createdAt: now,
  };

  groups.set(groupId, newGroup);
  persistData();

  // Notify all members
  cleanMembers.forEach((memberId) => {
    broadcastEvent({ type: 'group_created', group: newGroup }, memberId);
  });

  res.status(201).json({ success: true, group: newGroup });
});

app.get('/api/groups', (req: Request, res: Response) => {
  const userId = (req.query.userId as string)?.trim()?.toLowerCase();
  const allGroups = Array.from(groups.values());

  if (!userId) {
    res.json({ groups: allGroups });
    return;
  }

  const userGroups = allGroups.filter((g) => g.members.includes(userId));
  res.json({ groups: userGroups });
});

app.get('/api/groups/:id', (req: Request, res: Response) => {
  const group = groups.get(req.params.id);
  if (!group) {
    res.status(404).json({ error: 'Gruppo non trovato' });
    return;
  }
  res.json({ group });
});

app.put('/api/groups/:id', (req: Request, res: Response) => {
  const group = groups.get(req.params.id);
  if (!group) {
    res.status(404).json({ error: 'Gruppo non trovato' });
    return;
  }

  const { name, avatar, addMember, removeMember } = req.body;

  if (name) group.name = name.trim();
  if (avatar !== undefined) group.avatar = avatar;

  if (addMember) {
    const cleanMember = addMember.trim().toLowerCase();
    if (!group.members.includes(cleanMember)) {
      group.members.push(cleanMember);
    }
  }

  if (removeMember) {
    const cleanMember = removeMember.trim().toLowerCase();
    group.members = group.members.filter((m) => m !== cleanMember);
  }

  groups.set(group.id, group);
  persistData();

  broadcastToGroup(group.id, { type: 'group_updated', group });
  res.json({ success: true, group });
});

// ============================================
// 5. MESSAGES API (Direct & Group + View Once)
// ============================================
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

app.post('/api/messages', (req: Request, res: Response) => {
  const {
    id,
    senderId,
    recipientId,
    groupId,
    encryptedPayload,
    messageType,
    audioEffect,
    audioDuration,
    viewOnce,
  } = req.body;

  if (!senderId || (!recipientId && !groupId) || !encryptedPayload) {
    res.status(400).json({ error: 'Parametri messaggio mancanti' });
    return;
  }

  const cleanSender = senderId.trim().toLowerCase();
  const now = Date.now();
  const msgId = id || `msg_${now}_${Math.random().toString(36).substring(2, 9)}`;
  const expiresAt = now + TWENTY_FOUR_HOURS;

  const validTypes: MessageType[] = ['text', 'image', 'video', 'audio'];
  const finalType: MessageType = validTypes.includes(messageType) ? messageType : 'text';

  const newMsg: EncryptedMessage = {
    id: msgId,
    senderId: cleanSender,
    recipientId: groupId || (recipientId ? recipientId.trim().toLowerCase() : ''),
    groupId: groupId || undefined,
    encryptedPayload,
    messageType: finalType,
    audioEffect: audioEffect || undefined,
    audioDuration: typeof audioDuration === 'number' ? audioDuration : undefined,
    viewOnce: Boolean(viewOnce),
    viewed: false,
    viewedBy: [],
    createdAt: now,
    expiresAt,
  };

  messages.push(newMsg);
  persistData();

  // Delivery via SSE
  if (groupId) {
    broadcastToGroup(groupId, { type: 'new_message', message: newMsg });
  } else {
    broadcastEvent({ type: 'new_message', message: newMsg }, newMsg.recipientId);
    broadcastEvent({ type: 'new_message', message: newMsg }, cleanSender);
  }

  res.status(201).json({ success: true, message: newMsg });
});

// Fetch messages (supports user direct & group)
app.get('/api/messages', (req: Request, res: Response) => {
  const currentUserId = (req.query.userId as string)?.trim()?.toLowerCase();
  const peerId = (req.query.peerId as string)?.trim()?.toLowerCase();
  const groupId = (req.query.groupId as string)?.trim();

  if (!currentUserId && !groupId) {
    res.status(400).json({ error: 'userId o groupId richiesto' });
    return;
  }

  const now = Date.now();

  let filtered = messages.filter((m) => {
    if (m.expiresAt <= now) return false;

    if (groupId) {
      return m.groupId === groupId;
    }

    if (peerId) {
      return (
        !m.groupId &&
        ((m.senderId === currentUserId && m.recipientId === peerId) ||
          (m.senderId === peerId && m.recipientId === currentUserId))
      );
    }

    return (
      (m.senderId === currentUserId || m.recipientId === currentUserId) &&
      !m.groupId
    );
  });

  filtered = filtered.sort((a, b) => a.createdAt - b.createdAt);
  res.json({ messages: filtered });
});

// View Once: Mark as opened and permanently destroy payload
app.post('/api/messages/:id/view', (req: Request, res: Response) => {
  const msgId = req.params.id;
  const currentUserId = (req.body.userId as string)?.trim()?.toLowerCase();

  const targetMsg = messages.find((m) => m.id === msgId);
  if (!targetMsg) {
    res.status(404).json({ error: 'Messaggio non trovato o già scaduto' });
    return;
  }

  targetMsg.viewed = true;
  targetMsg.viewedAt = Date.now();

  if (currentUserId) {
    if (!targetMsg.viewedBy) targetMsg.viewedBy = [];
    if (!targetMsg.viewedBy.includes(currentUserId)) {
      targetMsg.viewedBy.push(currentUserId);
    }
  }

  // If view-once, wipe encrypted payload permanently
  if (targetMsg.viewOnce) {
    targetMsg.encryptedPayload = ''; // Zeroed out
  }

  persistData();

  const eventPayload = {
    type: 'message_viewed',
    messageId: msgId,
    userId: currentUserId,
    viewOnce: targetMsg.viewOnce,
  };

  if (targetMsg.groupId) {
    broadcastToGroup(targetMsg.groupId, eventPayload);
  } else {
    broadcastEvent(eventPayload, targetMsg.senderId);
    broadcastEvent(eventPayload, targetMsg.recipientId);
  }

  res.json({ success: true, messageId: msgId, burned: targetMsg.viewOnce });
});

// Delete specific message
app.delete('/api/messages/:id', (req: Request, res: Response) => {
  const msgId = req.params.id;
  const currentUserId = (req.query.userId as string)?.trim()?.toLowerCase();

  const targetMsg = messages.find((m) => m.id === msgId);
  if (!targetMsg) {
    res.status(404).json({ error: 'Messaggio non trovato o già scaduto' });
    return;
  }

  if (
    currentUserId &&
    targetMsg.senderId !== currentUserId &&
    targetMsg.recipientId !== currentUserId &&
    !targetMsg.groupId
  ) {
    res.status(403).json({ error: 'Non autorizzato a eliminare questo messaggio' });
    return;
  }

  messages = messages.filter((m) => m.id !== msgId);
  persistData();

  const event = { type: 'message_deleted', messageId: msgId };
  if (targetMsg.groupId) {
    broadcastToGroup(targetMsg.groupId, event);
  } else {
    broadcastEvent(event, targetMsg.senderId);
    broadcastEvent(event, targetMsg.recipientId);
  }

  res.json({ success: true, messageId: msgId });
});

// Wipe conversation
app.delete('/api/conversations', (req: Request, res: Response) => {
  const user1 = (req.query.user1 as string)?.trim()?.toLowerCase();
  const user2 = (req.query.user2 as string)?.trim()?.toLowerCase();
  const groupId = (req.query.groupId as string)?.trim();

  let count = 0;

  if (groupId) {
    const deletedIds: string[] = [];
    messages = messages.filter((m) => {
      if (m.groupId === groupId) {
        deletedIds.push(m.id);
        return false;
      }
      return true;
    });
    count = deletedIds.length;
    persistData();
    broadcastToGroup(groupId, { type: 'conversation_cleared', groupId, deletedIds });
  } else if (user1 && user2) {
    const deletedIds: string[] = [];
    messages = messages.filter((m) => {
      const isConv =
        !m.groupId &&
        ((m.senderId === user1 && m.recipientId === user2) ||
          (m.senderId === user2 && m.recipientId === user1));
      if (isConv) {
        deletedIds.push(m.id);
        return false;
      }
      return true;
    });
    count = deletedIds.length;
    persistData();
    broadcastEvent({ type: 'conversation_cleared', user1, user2, deletedIds }, user1);
    broadcastEvent({ type: 'conversation_cleared', user1, user2, deletedIds }, user2);
  }

  res.json({ success: true, count });
});

// Vite Server
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Cypher24 Server] Running securely on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
