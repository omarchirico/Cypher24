import React, { useState } from 'react';
import type { UserProfile, AppTheme, ChatContact, GroupChat } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Settings,
  Plus,
  Search,
  Shield,
  Copy,
  Check,
  QrCode,
  Clock,
  Users,
  UserPlus,
} from 'lucide-react';

interface Props {
  currentUser: UserProfile;
  contacts: ChatContact[];
  groups: GroupChat[];
  activeTarget: { type: 'direct'; id: string } | { type: 'group'; id: string } | null;
  onSelectPeer: (peerId: string) => void;
  onSelectGroup: (groupId: string) => void;
  onStartNewChat: (targetId: string) => Promise<boolean>;
  onOpenCreateGroup: () => void;
  onOpenProfile: () => void;
  currentTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  onShowQR: () => void;
}

export const Sidebar: React.FC<Props> = ({
  currentUser,
  contacts,
  groups,
  activeTarget,
  onSelectPeer,
  onSelectGroup,
  onStartNewChat,
  onOpenCreateGroup,
  onOpenProfile,
  currentTheme,
  onSelectTheme,
  onShowQR,
}) => {
  const [newChatInput, setNewChatInput] = useState('');
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'groups'>('all');

  const handleCopyMyId = () => {
    navigator.clipboard.writeText(currentUser.userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleStartChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newChatInput.trim().toLowerCase().replace(/^@/, '');
    if (!cleanId) return;

    if (cleanId === currentUser.userId.toLowerCase()) {
      setErrorMessage('Non puoi avviare una chat con te stesso');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    try {
      setIsStartingChat(true);
      setErrorMessage(null);
      const success = await onStartNewChat(cleanId);
      if (success) {
        setNewChatInput('');
      } else {
        setErrorMessage(`Utente @${cleanId} non trovato. Controlla l'ID.`);
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } finally {
      setIsStartingChat(false);
    }
  };

  // Filter contacts and groups
  const q = searchQuery.toLowerCase().trim();
  const filteredContacts = contacts.filter((c) => {
    if (activeTab === 'groups') return false;
    if (!q) return true;
    return c.userId.toLowerCase().includes(q) || c.displayName.toLowerCase().includes(q);
  });

  const filteredGroups = groups.filter((g) => {
    if (activeTab === 'direct') return false;
    if (!q) return true;
    return g.name.toLowerCase().includes(q);
  });

  const totalItems = filteredContacts.length + filteredGroups.length;

  return (
    <aside className="w-full lg:w-80 xl:w-96 flex flex-col h-full bg-[var(--theme-surface)] border-r border-[var(--theme-border)] shrink-0">
      {/* User Header Profile Card */}
      <div className="p-4 border-b border-[var(--theme-border)] bg-[var(--theme-surface-elevated)]/50">
        <div className="flex items-center justify-between">
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-3 text-left group min-w-0 cursor-pointer"
            title="Impostazioni profilo e foto"
          >
            <div className="relative shrink-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.displayName}
                className="w-11 h-11 rounded-2xl object-cover border-2 border-white/20 group-hover:border-[var(--theme-accent-color)] transition shadow-md"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black" />
            </div>

            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate group-hover:text-[var(--theme-accent-color)] transition">
                {currentUser.displayName}
              </h1>
              <p className="text-xs font-mono text-slate-400 truncate">
                @{currentUser.userId}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1">
            <PWAInstallButton />
            <button
              onClick={onOpenProfile}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title="Notifiche, profilo e temi"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Share ID banner */}
        <div className="mt-3.5 flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] text-slate-400">ID per condividere:</span>
            <span className="font-mono font-semibold text-white truncate select-all">
              @{currentUser.userId}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCopyMyId}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition cursor-pointer"
              title="Copia ID"
            >
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={onShowQR}
              className="p-1.5 rounded-lg bg-[var(--theme-accent-color)]/20 hover:bg-[var(--theme-accent-color)]/30 text-[var(--theme-accent-color)] transition cursor-pointer"
              title="Mostra QR per iPhone"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Start New Chat & Create Group */}
      <div className="p-3 border-b border-[var(--theme-border)] space-y-2">
        <form onSubmit={handleStartChatSubmit} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-300">
              Inizia chat con ID
            </label>
            <button
              type="button"
              onClick={onOpenCreateGroup}
              className="flex items-center gap-1 text-[11px] text-[var(--theme-accent-color)] hover:underline font-semibold cursor-pointer"
            >
              <Users className="w-3 h-3" />
              <span>+ Crea Gruppo</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">@</span>
              <input
                type="text"
                value={newChatInput}
                onChange={(e) => setNewChatInput(e.target.value.toLowerCase())}
                placeholder="id_amico"
                className="w-full pl-7 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[var(--theme-accent-color)] transition"
              />
            </div>
            <button
              type="submit"
              disabled={!newChatInput.trim() || isStartingChat}
              className="px-3 py-2 rounded-xl bg-[var(--theme-accent-color)] text-black font-bold text-xs hover:brightness-110 active:scale-95 disabled:opacity-40 transition cursor-pointer flex items-center gap-1 shrink-0"
              title="Apri chat cifrata"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Apri</span>
            </button>
          </div>
        </form>

        {errorMessage && (
          <p className="text-[11px] text-rose-400 px-1">{errorMessage}</p>
        )}

        {/* Filter Tabs (Tutte, Dirette, Gruppi) */}
        <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white/15 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tutte ({contacts.length + groups.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'direct'
                ? 'bg-white/15 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Dirette ({contacts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`flex-1 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'groups'
                ? 'bg-white/15 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Gruppi ({groups.length})
          </button>
        </div>
      </div>

      {/* Active Chats & Groups List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
        {totalItems === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto text-slate-400">
              <Shield className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Nessuna conversazione</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Cerca un ID sopra per aprire una chat o tocca <strong className="text-white">+ Crea Gruppo</strong>.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Render Groups */}
            {filteredGroups.map((group) => {
              const isSelected = activeTarget?.type === 'group' && activeTarget.id === group.id;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => onSelectGroup(group.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-white/10 border border-white/15 shadow-sm'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={group.avatar}
                      alt={group.name}
                      className="w-11 h-11 rounded-2xl object-cover border border-white/10"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-sky-500 text-black border-2 border-black flex items-center justify-center text-[9px] font-bold">
                      <Users className="w-2.5 h-2.5" />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{group.name}</span>
                      </span>
                      {group.lastMessageTime && (
                        <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                          {new Date(group.lastMessageTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-400 truncate pr-2">
                        {group.lastMessagePreview || `${group.members.length} partecipanti`}
                      </p>

                      <span className="text-[10px] text-sky-400 flex items-center gap-0.5 font-mono">
                        <Clock className="w-2.5 h-2.5" /> 24h
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Render Direct Contacts */}
            {filteredContacts.map((contact) => {
              const isSelected = activeTarget?.type === 'direct' && activeTarget.id.toLowerCase() === contact.userId.toLowerCase();
              const isOnline = Date.now() - contact.lastSeen < 2 * 60 * 1000;

              return (
                <button
                  key={contact.userId}
                  type="button"
                  onClick={() => onSelectPeer(contact.userId)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-white/10 border border-white/15 shadow-sm'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={contact.avatar}
                      alt={contact.displayName}
                      className="w-11 h-11 rounded-2xl object-cover border border-white/10"
                    />
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">
                        {contact.displayName}
                      </span>
                      {contact.lastMessageTime && (
                        <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                          {new Date(contact.lastMessageTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-400 truncate pr-2">
                        {contact.lastMessagePreview || `@${contact.userId}`}
                      </p>

                      <span className="text-[10px] text-slate-500 flex items-center gap-0.5 font-mono">
                        <Clock className="w-2.5 h-2.5 text-sky-400" /> 24h
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Bottom status / Theme Quick Switch */}
      <div className="p-3 border-t border-[var(--theme-border)] bg-[var(--theme-surface-elevated)]/30 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>E2E & Wipe 24h attivo</span>
        </span>

        {/* 4 Mini Theme Dots */}
        <div className="flex items-center gap-1.5" title="Cambia tema">
          {(['nero', 'verde', 'blu', 'viola'] as AppTheme[]).map((thm) => (
            <button
              key={thm}
              type="button"
              onClick={() => onSelectTheme(thm)}
              className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                currentTheme === thm ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-black' : 'opacity-60 hover:opacity-100'
              } ${
                thm === 'nero'
                  ? 'bg-slate-400'
                  : thm === 'verde'
                  ? 'bg-emerald-400'
                  : thm === 'blu'
                  ? 'bg-sky-400'
                  : 'bg-purple-400'
              }`}
              title={`Tema ${thm}`}
            />
          ))}
        </div>
      </div>
    </aside>
  );
};
