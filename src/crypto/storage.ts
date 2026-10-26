import type { UserKeyBundle } from './e2e';
import type { AppLanguage } from '../types';

export type AppTheme = 'nero' | 'verde' | 'blu' | 'viola';

export interface StoredIdentity {
  userId: string;
  displayName: string;
  avatar: string;
  keys: UserKeyBundle;
  theme: AppTheme;
  language?: AppLanguage;
}

const DB_NAME = 'cypher24_vault';
const STORE_NAME = 'identity';
const KEY_NAME = 'current_user';

function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalIdentity(identity: StoredIdentity): Promise<void> {
  try {
    const db = await openVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(identity, KEY_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Fallback to localStorage
    try {
      localStorage.setItem('cypher24_identity', JSON.stringify(identity));
    } catch (e) {
      console.error('Failed to store identity:', e);
    }
  }
}

export async function loadLocalIdentity(): Promise<StoredIdentity | null> {
  try {
    const db = await openVaultDB();
    const result = await new Promise<StoredIdentity | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_NAME);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (result) return result;
  } catch {
    // Try localStorage fallback
  }

  try {
    const backup = localStorage.getItem('cypher24_identity');
    if (backup) {
      return JSON.parse(backup);
    }
  } catch {
    // Ignore
  }

  return null;
}

export async function clearLocalIdentity(): Promise<void> {
  try {
    const db = await openVaultDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
  localStorage.removeItem('cypher24_identity');
}

export function saveTheme(theme: AppTheme): void {
  localStorage.setItem('cypher24_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function getSavedTheme(): AppTheme {
  const saved = localStorage.getItem('cypher24_theme') as AppTheme;
  if (saved && ['nero', 'verde', 'blu', 'viola'].includes(saved)) {
    return saved;
  }
  return 'nero';
}
