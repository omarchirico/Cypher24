import React, { useState } from 'react';
import type { GroupChat } from '../types';
import { Users, X, UserPlus, Flame, Shield, LogOut } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  group: GroupChat;
  currentUserId: string;
  onAddMember: (newMemberId: string) => Promise<void>;
  onLeaveGroup: () => Promise<void>;
  onBurnGroupChat: () => void;
}

export const GroupInfoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  group,
  currentUserId,
  onAddMember,
  onLeaveGroup,
  onBurnGroupChat,
}) => {
  const [newMemberId, setNewMemberId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newMemberId.trim().toLowerCase().replace(/^@/, '');
    if (!clean) return;
    if (group.members.includes(clean)) {
      setError('Utente già presente nel gruppo');
      return;
    }
    try {
      setIsAdding(true);
      setError(null);
      await onAddMember(clean);
      setNewMemberId('');
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'aggiunta');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-2xl p-6 text-slate-100 relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Group Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <img
            src={group.avatar}
            alt={group.name}
            className="w-20 h-20 rounded-3xl object-cover border-2 border-white/20 shadow-xl mb-3"
          />
          <h2 className="text-lg font-bold text-white">{group.name}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gruppo con {group.members.length} partecipanti · Creato da @{group.createdBy}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Add Member Field */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">@</span>
            <input
              type="text"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value.toLowerCase())}
              placeholder="nuovo_membro"
              className="w-full pl-7 pr-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[var(--theme-accent-color)]"
            />
          </div>
          <button
            type="submit"
            disabled={!newMemberId.trim() || isAdding}
            className="px-3.5 py-2 rounded-xl bg-[var(--theme-accent-color)] text-black font-bold text-xs disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Aggiungi</span>
          </button>
        </form>

        {/* Members List */}
        <div className="space-y-1.5 mb-5">
          <span className="text-xs font-semibold text-slate-300 block">
            Partecipanti ({group.members.length})
          </span>
          <div className="max-h-48 overflow-y-auto space-y-1 p-2 bg-black/40 rounded-2xl border border-white/5">
            {group.members.map((memberId) => (
              <div
                key={memberId}
                className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-mono font-medium text-white">@{memberId}</span>
                  {memberId === currentUserId && (
                    <span className="text-[10px] text-sky-400 font-semibold">(Tu)</span>
                  )}
                </div>
                {memberId === group.createdBy && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Creatore
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onBurnGroupChat}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition py-1 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Brucia chat gruppo</span>
          </button>

          <button
            type="button"
            onClick={onLeaveGroup}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition py-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Esci dal gruppo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
