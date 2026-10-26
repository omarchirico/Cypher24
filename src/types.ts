export type AppTheme = 'nero' | 'verde' | 'blu' | 'viola';

export interface UserProfile {
  userId: string;
  displayName: string;
  avatar: string;
  publicKey: JsonWebKey | null;
  lastSeen: number;
  createdAt: number;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio';
export type AudioPitchEffect = 'normal' | 'high' | 'low';

export interface EncryptedMessageRecord {
  id: string;
  senderId: string;
  recipientId: string; // userId or groupId
  groupId?: string; // set if sent in a group
  encryptedPayload: string;
  messageType: MessageType;
  audioEffect?: AudioPitchEffect;
  audioDuration?: number; // in seconds
  viewOnce?: boolean; // self-destruct after single view
  viewed?: boolean;
  viewedBy?: string[]; // userIds that have opened it
  viewedAt?: number;
  createdAt: number;
  expiresAt: number; // max 24h
}

export interface DecryptedMessage extends EncryptedMessageRecord {
  decryptedContent?: string;
  isDecrypted?: boolean;
  decryptionError?: boolean;
  isViewOnceOpenedLocally?: boolean;
}

export interface GroupChat {
  id: string;
  name: string;
  avatar: string;
  members: string[]; // userIds
  createdBy: string;
  createdAt: number;
  lastMessagePreview?: string;
  lastMessageTime?: number;
  unreadCount?: number;
}

export interface ChatContact {
  userId: string;
  displayName: string;
  avatar: string;
  publicKey: JsonWebKey | null;
  lastSeen: number;
  lastMessagePreview?: string;
  lastMessageTime?: number;
  unreadCount?: number;
}

export type ActiveTarget =
  | { type: 'direct'; user: UserProfile }
  | { type: 'group'; group: GroupChat };
