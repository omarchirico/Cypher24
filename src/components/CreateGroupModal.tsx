import React, { useState, useRef } from 'react';
import type { ChatContact } from '../types';
import { generateDefaultAvatar, compressUserPhoto } from '../utils/avatar';
import { Users, X, Plus, Check, Camera, Upload, Shield } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contacts: ChatContact[];
  currentUserId: string;
  onCreateGroup: (name: string, avatar: string, members: string[]) => Promise<void>;
}

export const CreateGroupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  contacts,
  currentUserId,
  onCreateGroup,
}) => {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [typedMember, setTypedMember] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleToggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers((prev) => prev.filter((id) => id !== userId));
    } else {
      setSelectedMembers((prev) => [...prev, userId]);
    }
  };

  const handleAddTypedMember = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = typedMember.trim().toLowerCase().replace(/^@/, '');
    if (!clean) return;
    if (clean === currentUserId.toLowerCase()) {
      setError('Sei già incluso automaticamente nel gruppo');
      return;
    }
    if (!selectedMembers.includes(clean)) {
      setSelectedMembers((prev) => [...prev, clean]);
    }
    setTypedMember('');
    setError(null);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressUserPhoto(file, 240, 0.85);
      setGroupAvatar(compressed);
    } catch (err) {
      console.error('Failed to compress group avatar:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Inserisci un nome per il gruppo');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const finalAvatar = groupAvatar || generateDefaultAvatar(groupName);
      await onCreateGroup(groupName.trim(), finalAvatar, selectedMembers);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Errore durante la creazione del gruppo');
    } finally {
      setIsLoading(false);
    }
  };

  const previewAvatar = groupAvatar || (groupName.trim() ? generateDefaultAvatar(groupName) : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-2xl p-6 text-slate-100 relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Nuovo Gruppo Cifrato</h3>
            <p className="text-xs text-slate-400">Messaggistica di gruppo con wipe automatico a 24h</p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Group Icon & Name */}
          <div className="flex items-center gap-3">
            <div className="relative group shrink-0">
              {previewAvatar ? (
                <img
                  src={previewAvatar}
                  alt="Gruppo"
                  className="w-14 h-14 rounded-2xl object-cover border border-white/20 shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-slate-400">
                  <Users className="w-6 h-6" />
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                title="Carica icona gruppo"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nome Gruppo *
              </label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Es. Squad Segreta"
                className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--theme-accent-color)]"
              />
            </div>
          </div>

          {/* Add member by ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Aggiungi Membro per ID
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">@</span>
                <input
                  type="text"
                  value={typedMember}
                  onChange={(e) => setTypedMember(e.target.value.toLowerCase())}
                  placeholder="id_utente"
                  className="w-full pl-7 pr-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[var(--theme-accent-color)]"
                />
              </div>
              <button
                type="button"
                onClick={handleAddTypedMember}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
              >
                Aggiungi
              </button>
            </div>
          </div>

          {/* Contacts quick picker */}
          {contacts.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Seleziona dai tuoi contatti:
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1 p-1 bg-black/30 rounded-xl border border-white/5">
                {contacts.map((c) => {
                  const isChecked = selectedMembers.includes(c.userId);
                  return (
                    <button
                      key={c.userId}
                      type="button"
                      onClick={() => handleToggleMember(c.userId)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition cursor-pointer ${
                        isChecked ? 'bg-sky-500/20 text-white' : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={c.avatar}
                          alt={c.displayName}
                          className="w-6 h-6 rounded-lg object-cover"
                        />
                        <span className="text-xs truncate">{c.displayName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">@{c.userId}</span>
                      </div>
                      {isChecked && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected members chips */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedMembers.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] font-mono"
                >
                  @{m}
                  <button
                    type="button"
                    onClick={() => handleToggleMember(m)}
                    className="hover:text-rose-400 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !groupName.trim()}
            className="w-full mt-2 py-3 rounded-2xl bg-[var(--theme-accent-color)] text-black font-bold text-xs hover:brightness-110 active:scale-95 transition disabled:opacity-40 cursor-pointer shadow-lg"
          >
            {isLoading ? 'Creazione gruppo...' : 'Crea Gruppo Cifrato'}
          </button>
        </form>
      </div>
    </div>
  );
};
