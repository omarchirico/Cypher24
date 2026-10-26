import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  UserProfile,
  DecryptedMessage,
  ChatContact,
  GroupChat,
  AppTheme,
  AppLanguage,
  ActiveTarget,
  AudioPitchEffect,
  MessageType,
} from './types';
import {
  loadLocalIdentity,
  saveTheme,
  getSavedTheme,
  saveLocalIdentity,
  clearLocalIdentity,
} from './crypto/storage';
import {
  getSavedLanguage,
  saveLanguage,
  t,
} from './i18n/translations';
import {
  encryptMessage,
  decryptMessage,
  computeSafetyNumber,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from './crypto/e2e';
import { Onboarding } from './components/Onboarding';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { ProfileModal } from './components/ProfileModal';
import { SafetyNumberModal } from './components/SafetyNumberModal';
import { VoiceRecorderModal } from './components/VoiceRecorderModal';
import { ViewOnceModal } from './components/ViewOnceModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { GroupInfoModal } from './components/GroupInfoModal';
import { InAppNotificationToast, ToastNotificationData } from './components/InAppNotificationToast';
import {
  getNotificationSettings,
  triggerSystemNotification,
  triggerHapticFeedback,
} from './utils/notifications';
import { playSendSound, playReceiveSound, playBurnSound } from './utils/audio';
import { apiUrl } from './utils/api';
import { Lock, Clock, QrCode, X, Users, Sparkles, Globe } from 'lucide-react';
import QRCode from 'qrcode';

// Helper to translate text using backend Gemini API
async function requestTranslation(text: string, targetLang: AppLanguage): Promise<string> {
  if (!text || !text.trim()) return text;
  try {
    const res = await fetch(apiUrl('/api/translate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data.translatedText || text;
  } catch (err) {
    console.warn('Translation request failed:', err);
    return text;
  }
}

// Group symmetric AES-GCM Key derivation
async function getGroupCryptoKey(groupId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`cypher24_group_vault_v1_${groupId}`)
  );
  return window.crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptGroupPayload(plaintext: string, groupId: string): Promise<string> {
  const key = await getGroupCryptoKey(groupId);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  return JSON.stringify({
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertextBuffer)),
    version: 1,
  });
}

async function decryptGroupPayload(encryptedPayloadStr: string, groupId: string): Promise<string> {
  try {
    const bundle = JSON.parse(encryptedPayloadStr);
    const key = await getGroupCryptoKey(groupId);
    const iv = base64ToUint8Array(bundle.iv);
    const ciphertext = base64ToUint8Array(bundle.ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext as unknown as BufferSource
    );
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch {
    return '🔒 Impossibile decifrare il messaggio di gruppo';
  }
}

export default function App() {
  const [identity, setIdentity] = useState<any | null>(null);
  const [theme, setTheme] = useState<AppTheme>(() => getSavedTheme());
  const [language, setLanguage] = useState<AppLanguage>(() => getSavedLanguage());
  const [autoTranslate, setAutoTranslate] = useState<boolean>(() => {
    const saved = localStorage.getItem('cypher24_autotranslate');
    return saved === null ? true : saved === 'true';
  });
  const [isVaultLoading, setIsVaultLoading] = useState(true);

  // Active Target (Direct User or Group)
  const [activeTarget, setActiveTarget] = useState<ActiveTarget | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [safetyNumber, setSafetyNumber] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Active View Once item to inspect
  const [viewOnceItem, setViewOnceItem] = useState<DecryptedMessage | null>(null);

  // In-App Notification Toast
  const [toastData, setToastData] = useState<ToastNotificationData | null>(null);
  const unreadCounterRef = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeTargetRef = useRef<ActiveTarget | null>(null);
  activeTargetRef.current = activeTarget;

  const languageRef = useRef(language);
  languageRef.current = language;

  const autoTranslateRef = useRef(autoTranslate);
  autoTranslateRef.current = autoTranslate;

  // Clear unread title indicator on window focus
  useEffect(() => {
    const handleFocus = () => {
      unreadCounterRef.current = 0;
      document.title = 'Cypher24 - Messaggistica Crittografata';
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Sync theme attribute to <html> tag
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync HTML lang attribute
  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const handleSelectTheme = (newTheme: AppTheme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
    if (identity) {
      const updated = { ...identity, theme: newTheme };
      setIdentity(updated);
      saveLocalIdentity(updated);
    }
  };

  const handleSelectLanguage = async (newLang: AppLanguage) => {
    setLanguage(newLang);
    saveLanguage(newLang);
    if (identity) {
      const updated = { ...identity, language: newLang };
      setIdentity(updated);
      saveLocalIdentity(updated);
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: updated.userId,
          displayName: updated.displayName,
          avatar: updated.avatar,
          publicKey: updated.keys.publicKeyJwk,
          language: newLang,
        }),
      }).catch(console.warn);
    }

    // Re-translate current chat messages if autoTranslate is active
    if (autoTranslate) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.messageType === 'text' && m.decryptedContent && m.senderId !== identity?.userId) {
            requestTranslation(m.decryptedContent, newLang).then((translated) => {
              setMessages((currentMsgs) =>
                currentMsgs.map((cur) =>
                  cur.id === m.id
                    ? { ...cur, translatedContent: translated, isTranslated: true, showOriginal: false }
                    : cur
                )
              );
            });
          }
          return m;
        })
      );
    }
  };

  const handleToggleAutoTranslate = () => {
    const newVal = !autoTranslate;
    setAutoTranslate(newVal);
    localStorage.setItem('cypher24_autotranslate', String(newVal));

    if (newVal && identity) {
      // Trigger translations for visible messages
      setMessages((prev) =>
        prev.map((m) => {
          if (m.messageType === 'text' && m.decryptedContent && m.senderId !== identity.userId && !m.translatedContent) {
            requestTranslation(m.decryptedContent, language).then((translated) => {
              setMessages((currentMsgs) =>
                currentMsgs.map((cur) =>
                  cur.id === m.id
                    ? { ...cur, translatedContent: translated, isTranslated: true, showOriginal: false }
                    : cur
                )
              );
            });
          }
          return m;
        })
      );
    }
  };

  const handleToggleOriginal = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, showOriginal: !m.showOriginal } : m))
    );
  };

  // 1. Initial Load: Retrieve local vault identity
  useEffect(() => {
    async function initVault() {
      try {
        const stored = await loadLocalIdentity();
        if (stored) {
          setIdentity(stored);
          if (stored.theme) {
            setTheme(stored.theme);
            saveTheme(stored.theme);
          }
          if (stored.language) {
            setLanguage(stored.language);
            saveLanguage(stored.language);
          }
          fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: stored.userId,
              displayName: stored.displayName,
              avatar: stored.avatar,
              publicKey: stored.keys.publicKeyJwk,
              language: stored.language || language,
            }),
          }).catch(console.warn);
        }
      } catch (err) {
        console.error('Failed to load local vault:', err);
      } finally {
        setIsVaultLoading(false);
      }
    }
    initVault();
  }, []);

  const fetchPeerProfile = useCallback(async (peerId: string): Promise<UserProfile | null> => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(peerId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.user as UserProfile;
    } catch {
      return null;
    }
  }, []);

  // Decrypt a message depending on whether it's group or direct
  const decryptRecord = useCallback(
    async (
      msg: any,
      myPrivateJwk: JsonWebKey,
      peerPublicJwk: JsonWebKey | null,
      peerId?: string,
      myId?: string
    ): Promise<DecryptedMessage> => {
      // If view-once was already burned / wiped on server
      if (msg.viewOnce && (msg.viewed || !msg.encryptedPayload)) {
        return {
          ...msg,
          decryptedContent: undefined,
          isDecrypted: true,
        };
      }

      let content = '';

      if (msg.groupId) {
        content = await decryptGroupPayload(msg.encryptedPayload, msg.groupId);
      } else if (peerPublicJwk && peerId && myId) {
        try {
          content = await decryptMessage(
            msg.encryptedPayload,
            myPrivateJwk,
            peerPublicJwk,
            peerId,
            myId
          );
        } catch {
          return {
            ...msg,
            decryptedContent: '🔒 Messaggio cifrato non decifrabile',
            decryptionError: true,
          };
        }
      }

      const res: DecryptedMessage = {
        ...msg,
        decryptedContent: content,
        isDecrypted: true,
      };

      // Automatic Translation check: if incoming text message, translate to recipient's language
      if (
        content &&
        msg.messageType === 'text' &&
        myId &&
        msg.senderId !== myId &&
        autoTranslateRef.current
      ) {
        try {
          const translated = await requestTranslation(content, languageRef.current);
          if (translated && translated !== content) {
            res.translatedContent = translated;
            res.isTranslated = true;
            res.showOriginal = false;
          }
        } catch (e) {
          console.warn('Auto translation error:', e);
        }
      }

      return res;
    },
    []
  );

  // 2. Load messages for active target
  const loadTargetMessages = useCallback(
    async (target: ActiveTarget) => {
      if (!identity) return;

      try {
        let url = '';
        if (target.type === 'group') {
          url = `/api/messages?groupId=${encodeURIComponent(target.group.id)}`;
        } else {
          url = `/api/messages?userId=${encodeURIComponent(identity.userId)}&peerId=${encodeURIComponent(
            target.user.userId
          )}`;
        }

        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        const rawList = data.messages || [];

        const decryptedList = await Promise.all(
          rawList.map((m: any) =>
            decryptRecord(
              m,
              identity.keys.privateKeyJwk,
              target.type === 'direct' ? target.user.publicKey : null,
              target.type === 'direct' ? target.user.userId : undefined,
              identity.userId
            )
          )
        );

        setMessages(decryptedList);

        if (target.type === 'direct' && target.user.publicKey) {
          const sn = await computeSafetyNumber(identity.keys.publicKeyJwk, target.user.publicKey);
          setSafetyNumber(sn);

          const verifiedKey = `cypher24_verified_${identity.userId}_${target.user.userId}`;
          setIsVerified(localStorage.getItem(verifiedKey) === 'true');
        }
      } catch (err) {
        console.error('Failed to load conversation:', err);
      }
    },
    [identity, decryptRecord]
  );

  useEffect(() => {
    if (activeTarget) {
      loadTargetMessages(activeTarget);
    } else {
      setMessages([]);
    }
  }, [activeTarget, loadTargetMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Refresh Contacts & Groups
  const refreshContactsAndGroups = useCallback(async () => {
    if (!identity) return;

    try {
      // 1. Fetch user's groups
      const grpRes = await fetch(`/api/groups?userId=${encodeURIComponent(identity.userId)}`);
      if (grpRes.ok) {
        const grpData = await grpRes.json();
        const rawGroups: GroupChat[] = grpData.groups || [];

        // Decorate groups with last message
        const updatedGroups: GroupChat[] = await Promise.all(
          rawGroups.map(async (g) => {
            const mRes = await fetch(`/api/messages?groupId=${encodeURIComponent(g.id)}`);
            if (mRes.ok) {
              const mData = await mRes.json();
              const list = mData.messages || [];
              const last = list[list.length - 1];
              let preview = '';
              if (last) {
                if (last.viewOnce) preview = '🔒 Media (1x)';
                else if (last.messageType === 'audio') preview = '🎤 Vocale cifrato';
                else if (last.messageType === 'video') preview = '🎬 Video cifrato';
                else if (last.messageType === 'image') preview = '📷 Foto cifrata';
                else {
                  preview = await decryptGroupPayload(last.encryptedPayload, g.id);
                }
              }
              return {
                ...g,
                lastMessagePreview: preview || undefined,
                lastMessageTime: last?.createdAt,
              };
            }
            return g;
          })
        );

        updatedGroups.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
        setGroups(updatedGroups);
      }

      // 2. Fetch direct messages for contacts
      const res = await fetch(`/api/messages?userId=${encodeURIComponent(identity.userId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const allMsgs = data.messages || [];

      const peerIds = new Set<string>();
      allMsgs.forEach((m: any) => {
        if (!m.groupId) {
          if (m.senderId !== identity.userId) peerIds.add(m.senderId);
          if (m.recipientId !== identity.userId) peerIds.add(m.recipientId);
        }
      });

      contacts.forEach((c) => peerIds.add(c.userId));

      const updatedContacts: ChatContact[] = [];

      for (const pId of Array.from(peerIds)) {
        const profile = await fetchPeerProfile(pId);
        if (!profile) continue;

        const peerMsgs = allMsgs.filter(
          (m: any) =>
            !m.groupId &&
            ((m.senderId === identity.userId && m.recipientId === pId) ||
              (m.senderId === pId && m.recipientId === identity.userId))
        );

        const lastMsg = peerMsgs[peerMsgs.length - 1];
        let preview = '';
        if (lastMsg) {
          if (lastMsg.viewOnce) {
            preview = '🔒 Media (1x)';
          } else if (lastMsg.messageType === 'audio') {
            preview = '🎤 Vocale cifrato';
          } else if (lastMsg.messageType === 'video') {
            preview = '🎬 Video cifrato';
          } else if (lastMsg.messageType === 'image') {
            preview = '📷 Foto cifrata';
          } else if (profile.publicKey) {
            try {
              preview = await decryptMessage(
                lastMsg.encryptedPayload,
                identity.keys.privateKeyJwk,
                profile.publicKey,
                pId,
                identity.userId
              );
            } catch {
              preview = '🔒 Messaggio cifrato';
            }
          }
        }

        updatedContacts.push({
          userId: profile.userId,
          displayName: profile.displayName,
          avatar: profile.avatar,
          publicKey: profile.publicKey,
          lastSeen: profile.lastSeen,
          lastMessagePreview: preview,
          lastMessageTime: lastMsg?.createdAt,
        });
      }

      updatedContacts.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
      setContacts(updatedContacts);
    } catch (err) {
      console.warn('Failed to refresh contacts & groups:', err);
    }
  }, [identity, contacts, fetchPeerProfile]);

  useEffect(() => {
    if (identity) {
      refreshContactsAndGroups();
    }
  }, [identity, refreshContactsAndGroups]);

  // 4. Handle ?chatWith=userId
  useEffect(() => {
    if (!identity) return;
    const params = new URLSearchParams(window.location.search);
    const chatWith = params.get('chatWith');
    if (chatWith && chatWith.toLowerCase() !== identity.userId.toLowerCase()) {
      fetchPeerProfile(chatWith.toLowerCase()).then((peer) => {
        if (peer) {
          setActiveTarget({ type: 'direct', user: peer });
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      });
    }
  }, [identity, fetchPeerProfile]);

  // 5. SSE & Real-time message synchronization
  useEffect(() => {
    if (!identity) return;

    let eventSource: EventSource | null = null;
    let pollInterval: any = null;

    function connectSSE() {
      try {
        eventSource = new EventSource(`/api/events?userId=${encodeURIComponent(identity.userId)}`);

        eventSource.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'new_message') {
              const msg = data.message;
              const current = activeTargetRef.current;

              const isForActive =
                current &&
                ((current.type === 'group' && current.group.id === msg.groupId) ||
                  (current.type === 'direct' &&
                    !msg.groupId &&
                    ((msg.senderId === current.user.userId && msg.recipientId === identity.userId) ||
                      (msg.senderId === identity.userId && msg.recipientId === current.user.userId))));

              if (isForActive) {
                const decrypted = await decryptRecord(
                  msg,
                  identity.keys.privateKeyJwk,
                  current.type === 'direct' ? current.user.publicKey : null,
                  current.type === 'direct' ? current.user.userId : undefined,
                  identity.userId
                );

                setMessages((prev) => {
                  if (prev.some((m) => m.id === decrypted.id)) return prev;
                  return [...prev, decrypted];
                });
              }

              // If message is from someone else, trigger audio, haptic, push, and in-app notifications
              if (msg.senderId !== identity.userId) {
                const notifSettings = getNotificationSettings();

                // 1. Audio chime if enabled
                if (notifSettings.soundEnabled) {
                  playReceiveSound();
                }

                // 2. Mobile vibration
                triggerHapticFeedback();

                const isAppVisibleAndOnChat = !document.hidden && isForActive;

                if (!isAppVisibleAndOnChat) {
                  unreadCounterRef.current += 1;
                  document.title = `(${unreadCounterRef.current}) Cypher24`;

                  let previewText = 'Nuovo messaggio cifrato';
                  if (msg.viewOnce) previewText = '🔒 Media (1x)';
                  else if (msg.messageType === 'audio') previewText = '🎤 Messaggio vocale';
                  else if (msg.messageType === 'video') previewText = '🎬 Video';
                  else if (msg.messageType === 'image') previewText = '📷 Foto';

                  const groupObj = msg.groupId ? groups.find((g) => g.id === msg.groupId) : null;
                  const notificationTitle = groupObj ? `Gruppo: ${groupObj.name}` : `@${msg.senderId}`;

                  const targetObj = msg.groupId
                    ? { type: 'group' as const, id: msg.groupId }
                    : { type: 'direct' as const, id: msg.senderId };

                  // 3. System Push / Desktop Notification
                  if (notifSettings.systemEnabled) {
                    triggerSystemNotification({
                      title: notifSettings.previewEnabled ? notificationTitle : 'Cypher24',
                      body: notifSettings.previewEnabled ? previewText : 'Nuovo messaggio cifrato ricevuto',
                      icon: groupObj?.avatar || '/assets/aistudio/Gemini_Generated_Image_5ive2u5ive2u5ive_01e06a00.jpg',
                      onClick: () => {
                        if (msg.groupId && groupObj) {
                          setActiveTarget({ type: 'group', group: groupObj });
                        } else {
                          fetchPeerProfile(msg.senderId).then((peer) => {
                            if (peer) setActiveTarget({ type: 'direct', user: peer });
                          });
                        }
                      },
                    });
                  }

                  // 4. In-App Notification Toast
                  if (!isForActive) {
                    setToastData({
                      id: msg.id,
                      title: notificationTitle,
                      body: notifSettings.previewEnabled ? previewText : 'Nuovo messaggio cifrato',
                      avatar: groupObj?.avatar,
                      target: targetObj,
                    });
                  }
                }
              }

              refreshContactsAndGroups();
            } else if (data.type === 'message_viewed') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === data.messageId
                    ? { ...m, viewed: true, decryptedContent: undefined }
                    : m
                )
              );
              playBurnSound();
            } else if (data.type === 'message_deleted') {
              setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
              playBurnSound();
              refreshContactsAndGroups();
            } else if (data.type === 'conversation_cleared') {
              setMessages([]);
              playBurnSound();
              refreshContactsAndGroups();
            } else if (data.type === 'group_created' || data.type === 'group_updated') {
              refreshContactsAndGroups();
            } else if (data.type === 'purge') {
              const now = Date.now();
              setMessages((prev) => prev.filter((m) => m.expiresAt > now));
              refreshContactsAndGroups();
            }
          } catch (e) {
            console.warn('SSE message error:', e);
          }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          setTimeout(connectSSE, 3000);
        };
      } catch (err) {
        console.warn('SSE connect failed:', err);
      }
    }

    connectSSE();

    pollInterval = setInterval(() => {
      const current = activeTargetRef.current;
      if (current) {
        loadTargetMessages(current);
      }
      refreshContactsAndGroups();
    }, 4000);

    return () => {
      eventSource?.close();
      clearInterval(pollInterval);
    };
  }, [identity, decryptRecord, loadTargetMessages, refreshContactsAndGroups]);

  // 6. Action Handlers
  const handleSendMessage = async (
    content: string,
    type: MessageType,
    viewOnce = false,
    audioEffect?: AudioPitchEffect,
    audioDuration?: number
  ) => {
    if (!identity || !activeTarget) return;

    let encryptedPayload = '';

    if (activeTarget.type === 'group') {
      encryptedPayload = await encryptGroupPayload(content, activeTarget.group.id);
    } else {
      if (!activeTarget.user.publicKey) return;
      encryptedPayload = await encryptMessage(
        content,
        identity.keys.privateKeyJwk,
        activeTarget.user.publicKey,
        activeTarget.user.userId,
        identity.userId
      );
    }

    const now = Date.now();
    const tempId = `msg_${now}_${Math.random().toString(36).substring(2, 9)}`;

    const optimisticMsg: DecryptedMessage = {
      id: tempId,
      senderId: identity.userId,
      recipientId: activeTarget.type === 'group' ? activeTarget.group.id : activeTarget.user.userId,
      groupId: activeTarget.type === 'group' ? activeTarget.group.id : undefined,
      encryptedPayload,
      messageType: type,
      audioEffect,
      audioDuration,
      viewOnce,
      viewed: false,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
      decryptedContent: content,
      isDecrypted: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    playSendSound();

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: tempId,
        senderId: identity.userId,
        recipientId: activeTarget.type === 'group' ? activeTarget.group.id : activeTarget.user.userId,
        groupId: activeTarget.type === 'group' ? activeTarget.group.id : undefined,
        encryptedPayload,
        messageType: type,
        audioEffect,
        audioDuration,
        viewOnce,
      }),
    });

    refreshContactsAndGroups();
  };

  const handleSendVoiceMessage = async (
    audioDataUrl: string,
    duration: number,
    effect: AudioPitchEffect
  ) => {
    await handleSendMessage(audioDataUrl, 'audio', false, effect, duration);
  };

  // Open & Burn View-Once media
  const handleOpenViewOnce = (msg: DecryptedMessage) => {
    setViewOnceItem(msg);
  };

  const handleCloseAndBurnViewOnce = async () => {
    if (!viewOnceItem || !identity) return;
    const msgId = viewOnceItem.id;

    // Locally mark as opened and clear payload
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, viewed: true, decryptedContent: undefined } : m
      )
    );
    setViewOnceItem(null);
    playBurnSound();

    // Call server to permanently destroy payload
    await fetch(`/api/messages/${encodeURIComponent(msgId)}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: identity.userId }),
    });

    refreshContactsAndGroups();
  };

  const handleBurnMessage = async (messageId: string) => {
    if (!identity) return;
    try {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      playBurnSound();

      await fetch(
        `/api/messages/${encodeURIComponent(messageId)}?userId=${encodeURIComponent(
          identity.userId
        )}`,
        { method: 'DELETE' }
      );
      refreshContactsAndGroups();
    } catch (err) {
      console.error('Failed to burn message:', err);
    }
  };

  const handleBurnConversation = async () => {
    if (!identity || !activeTarget) return;
    try {
      setMessages([]);
      playBurnSound();

      let url = '';
      if (activeTarget.type === 'group') {
        url = `/api/conversations?groupId=${encodeURIComponent(activeTarget.group.id)}`;
      } else {
        url = `/api/conversations?user1=${encodeURIComponent(
          identity.userId
        )}&user2=${encodeURIComponent(activeTarget.user.userId)}`;
      }

      await fetch(url, { method: 'DELETE' });
      refreshContactsAndGroups();
    } catch (err) {
      console.error('Failed to wipe conversation:', err);
    }
  };

  const handleStartNewChat = async (targetId: string): Promise<boolean> => {
    const peer = await fetchPeerProfile(targetId);
    if (!peer) return false;

    setActiveTarget({ type: 'direct', user: peer });
    return true;
  };

  const handleCreateGroup = async (name: string, avatar: string, members: string[]) => {
    if (!identity) return;
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        avatar,
        members,
        createdBy: identity.userId,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const newGroup: GroupChat = data.group;
      setGroups((prev) => [newGroup, ...prev]);
      setActiveTarget({ type: 'group', group: newGroup });
    }
  };

  const handleAddGroupMember = async (newMemberId: string) => {
    if (!activeTarget || activeTarget.type !== 'group') return;
    const res = await fetch(`/api/groups/${activeTarget.group.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addMember: newMemberId }),
    });
    if (res.ok) {
      const data = await res.json();
      setActiveTarget({ type: 'group', group: data.group });
      refreshContactsAndGroups();
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeTarget || activeTarget.type !== 'group' || !identity) return;
    await fetch(`/api/groups/${activeTarget.group.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeMember: identity.userId }),
    });
    setActiveTarget(null);
    setShowGroupInfo(false);
    refreshContactsAndGroups();
  };

  const handleUpdateProfile = async (displayName: string, avatar: string) => {
    if (!identity) return;
    const updated = { ...identity, displayName, avatar };
    setIdentity(updated);
    await saveLocalIdentity(updated);

    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: updated.userId,
        displayName: updated.displayName,
        avatar: updated.avatar,
        publicKey: updated.keys.publicKeyJwk,
        language,
      }),
    });
  };

  const handleToggleVerified = () => {
    if (!identity || !activeTarget || activeTarget.type !== 'direct') return;
    const newVal = !isVerified;
    setIsVerified(newVal);
    const verifiedKey = `cypher24_verified_${identity.userId}_${activeTarget.user.userId}`;
    localStorage.setItem(verifiedKey, newVal ? 'true' : 'false');
  };

  const handleLogout = async () => {
    await clearLocalIdentity();
    setIdentity(null);
    setActiveTarget(null);
    setMessages([]);
    setContacts([]);
    setGroups([]);
    setShowProfileModal(false);
  };

  const handleShowQR = async () => {
    if (!identity) return;
    try {
      const url = `${window.location.origin}/?chatWith=${encodeURIComponent(identity.userId)}`;
      const qr = await QRCode.toDataURL(url, {
        margin: 2,
        width: 320,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(qr);
      setShowQRModal(true);
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  };

  const handleOpenTargetFromToast = (target: { type: 'direct'; id: string } | { type: 'group'; id: string }) => {
    if (target.type === 'group') {
      const grp = groups.find((g) => g.id === target.id);
      if (grp) setActiveTarget({ type: 'group', group: grp });
    } else {
      fetchPeerProfile(target.id).then((peer) => {
        if (peer) setActiveTarget({ type: 'direct', user: peer });
      });
    }
  };

  if (isVaultLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/assets/aistudio/Gemini_Generated_Image_5ive2u5ive2u5ive_01e06a00.jpg"
            alt="Cypher24"
            className="w-14 h-14 rounded-2xl object-cover animate-pulse shadow-lg ring-2 ring-sky-500/30"
          />
          <span className="text-xs text-slate-400 font-mono tracking-wider">
            {t('creatingKeys', language)}
          </span>
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <Onboarding
        initialTheme={theme}
        initialLanguage={language}
        onLanguageChange={handleSelectLanguage}
        onCompleted={(newId) => {
          setIdentity(newId);
          setTheme(newId.theme || 'nero');
          if (newId.language) {
            setLanguage(newId.language);
          }
        }}
      />
    );
  }

  const currentUserProfile: UserProfile = {
    userId: identity.userId,
    displayName: identity.displayName,
    avatar: identity.avatar,
    publicKey: identity.keys.publicKeyJwk,
    language,
    lastSeen: Date.now(),
    createdAt: Date.now(),
  };

  const activeTargetId =
    activeTarget?.type === 'direct'
      ? { type: 'direct' as const, id: activeTarget.user.userId }
      : activeTarget?.type === 'group'
      ? { type: 'group' as const, id: activeTarget.group.id }
      : null;

  const currentChatName =
    activeTarget?.type === 'group' ? activeTarget.group.name : activeTarget?.user.displayName || '';

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[var(--theme-bg)] text-slate-100 antialiased select-none">
      {/* 1. Sidebar */}
      <div
        className={`${
          activeTarget ? 'hidden lg:flex' : 'flex'
        } w-full lg:w-80 xl:w-96 h-full flex-col`}
      >
        <Sidebar
          currentUser={currentUserProfile}
          contacts={contacts}
          groups={groups}
          activeTarget={activeTargetId}
          onSelectPeer={(pId) => {
            fetchPeerProfile(pId).then((peer) => {
              if (peer) setActiveTarget({ type: 'direct', user: peer });
            });
          }}
          onSelectGroup={(groupId) => {
            const grp = groups.find((g) => g.id === groupId);
            if (grp) setActiveTarget({ type: 'group', group: grp });
          }}
          onStartNewChat={handleStartNewChat}
          onOpenCreateGroup={() => setShowCreateGroup(true)}
          onOpenProfile={() => setShowProfileModal(true)}
          currentTheme={theme}
          onSelectTheme={handleSelectTheme}
          onShowQR={handleShowQR}
          currentLanguage={language}
          onSelectLanguage={handleSelectLanguage}
        />
      </div>

      {/* 2. Main Chat Workspace */}
      <div
        className={`${
          !activeTarget ? 'hidden lg:flex' : 'flex'
        } flex-1 h-full flex-col bg-[var(--theme-bg)] relative min-w-0`}
      >
        {activeTarget ? (
          <>
            <ChatHeader
              target={activeTarget}
              isVerified={isVerified}
              onBack={() => setActiveTarget(null)}
              onOpenSafetyNumber={() => setShowSafetyModal(true)}
              onOpenGroupInfo={() => setShowGroupInfo(true)}
              onBurnConversation={handleBurnConversation}
              currentLanguage={language}
            />

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
              <div className="max-w-md mx-auto my-3 p-3.5 rounded-2xl bg-black/40 border border-white/5 text-center text-xs text-slate-400 space-y-1">
                <div className="flex items-center justify-center gap-1.5 font-bold text-white">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {activeTarget.type === 'group'
                      ? t('groupEncrypted', language)
                      : t('e2eActive', language)}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {activeTarget.type === 'group'
                    ? `Messaggi crittografati nel gruppo "${activeTarget.group.name}".`
                    : `Conversazione cifrata end-to-end con @${activeTarget.user.userId}.`}
                </p>
                <div className="inline-flex items-center gap-1 text-[10px] text-sky-400 pt-0.5 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{t('autoWipe', language)}</span>
                </div>
              </div>

              {messages.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  <Sparkles className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                  <p className="text-slate-400 font-semibold">{t('noMessages', language)}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {t('noMessagesDesc', language)}
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isMine={m.senderId === identity.userId}
                    onBurnMessage={handleBurnMessage}
                    onOpenViewOnce={handleOpenViewOnce}
                    onToggleOriginal={handleToggleOriginal}
                    senderPhoto={
                      m.senderId === identity.userId
                        ? identity.avatar
                        : activeTarget.type === 'direct'
                        ? activeTarget.user.avatar
                        : undefined
                    }
                    senderName={m.senderId}
                    isGroup={activeTarget.type === 'group'}
                    currentLanguage={language}
                  />
                ))
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <ChatInput
              onSendMessage={handleSendMessage}
              onOpenVoiceRecorder={() => setShowVoiceRecorder(true)}
              targetName={currentChatName}
              disabled={activeTarget.type === 'direct' && !activeTarget.user.publicKey}
              currentLanguage={language}
            />
          </>
        ) : (
          /* Empty Chat Placeholder with Logo */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="relative group">
              <img
                src="/assets/aistudio/Gemini_Generated_Image_5ive2u5ive2u5ive_01e06a00.jpg"
                alt="Cypher24 Logo"
                className="w-24 h-24 rounded-3xl object-cover shadow-2xl ring-2 ring-[var(--theme-accent-color)]/50"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black" />
            </div>

            <div className="max-w-sm space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {t('appTitle', language)}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('appSubtitle', language)}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowCreateGroup(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--theme-accent-color)] text-black font-semibold text-xs transition cursor-pointer hover:brightness-110"
              >
                <Users className="w-4 h-4" />
                <span>{t('newGroup', language)}</span>
              </button>
              <button
                onClick={handleShowQR}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-200 border border-white/10 transition cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-sky-400" />
                <span>{t('shareId', language)} @{identity.userId}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Voice Recorder Modal with Pitch Modulation */}
      {showVoiceRecorder && (
        <VoiceRecorderModal
          isOpen={showVoiceRecorder}
          onClose={() => setShowVoiceRecorder(false)}
          onSendVoice={handleSendVoiceMessage}
          recipientName={currentChatName}
        />
      )}

      {/* View-Once Single View Modal */}
      {viewOnceItem && (
        <ViewOnceModal
          isOpen={Boolean(viewOnceItem)}
          mediaType={viewOnceItem.messageType === 'video' ? 'video' : 'image'}
          mediaSrc={viewOnceItem.decryptedContent || ''}
          senderName={viewOnceItem.senderId}
          onCloseAndBurn={handleCloseAndBurnViewOnce}
        />
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          isOpen={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          contacts={contacts}
          currentUserId={identity.userId}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {/* Group Info Modal */}
      {showGroupInfo && activeTarget?.type === 'group' && (
        <GroupInfoModal
          isOpen={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
          group={activeTarget.group}
          currentUserId={identity.userId}
          onAddMember={handleAddGroupMember}
          onLeaveGroup={handleLeaveGroup}
          onBurnGroupChat={handleBurnConversation}
        />
      )}

      {/* Profile & Settings Modal */}
      {showProfileModal && (
        <ProfileModal
          user={currentUserProfile}
          currentTheme={theme}
          currentLanguage={language}
          onSelectLanguage={handleSelectLanguage}
          autoTranslate={autoTranslate}
          onToggleAutoTranslate={handleToggleAutoTranslate}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onUpdateProfile={handleUpdateProfile}
          onSelectTheme={handleSelectTheme}
          onLogout={handleLogout}
        />
      )}

      {/* Safety Number Modal */}
      {showSafetyModal && activeTarget?.type === 'direct' && (
        <SafetyNumberModal
          isOpen={showSafetyModal}
          onClose={() => setShowSafetyModal(false)}
          peerUser={activeTarget.user}
          currentUser={currentUserProfile}
          safetyNumber={safetyNumber}
          isVerified={isVerified}
          onToggleVerified={handleToggleVerified}
        />
      )}

      {/* QR Code Quick Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center text-white relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold">{t('showQr', language)}</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Scansiona con la fotocamera per aprire la chat
            </p>

            <div className="p-3 bg-white rounded-2xl inline-block shadow-xl">
              <img src={qrDataUrl} alt="QR Code" className="w-56 h-56 mx-auto rounded-lg" />
            </div>

            <div className="mt-4 font-mono text-xs text-slate-300">
              ID: <span className="font-bold text-white">@{identity.userId}</span>
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* In-App Notification Toast */}
      <InAppNotificationToast
        toast={toastData}
        onClose={() => setToastData(null)}
        onOpenTarget={handleOpenTargetFromToast}
      />
    </div>
  );
}
