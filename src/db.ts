import type { Lead } from './types';

const DB_NAME = 'LICFieldTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'leads';
const LS_KEY = 'lic_field_tracker_leads_v1';

let activeEngine: 'IndexedDB' | 'localStorage' = 'IndexedDB';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('nextFollowUp', 'nextFollowUp', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    } catch (err) {
      reject(err);
    }
  });
}

function readLocalStorage(): Lead[] {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalStorage(leads: Lead[]): void {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(leads));
  } catch {
    // Ignore quota errors on fallback mirror
  }
}

export async function getAllLeads(): Promise<{ leads: Lead[]; engine: 'IndexedDB' | 'localStorage' }> {
  try {
    const db = await openDatabase();
    const leads = await new Promise<Lead[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as Lead[]) || []);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
    activeEngine = 'IndexedDB';
    // Keep localStorage mirrored as an extra safety net
    writeLocalStorage(leads);
    return { leads: sortLeads(leads), engine: activeEngine };
  } catch {
    activeEngine = 'localStorage';
    return { leads: sortLeads(readLocalStorage()), engine: activeEngine };
  }
}

export async function saveLead(lead: Lead): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(lead);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
    activeEngine = 'IndexedDB';
    const current = readLocalStorage();
    const idx = current.findIndex((item) => item.id === lead.id);
    if (idx >= 0) {
      current[idx] = lead;
    } else {
      current.unshift(lead);
    }
    writeLocalStorage(current);
  } catch {
    activeEngine = 'localStorage';
    const current = readLocalStorage();
    const idx = current.findIndex((item) => item.id === lead.id);
    if (idx >= 0) {
      current[idx] = lead;
    } else {
      current.unshift(lead);
    }
    writeLocalStorage(current);
  }
}

export async function deleteLeadById(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
    activeEngine = 'IndexedDB';
    const filtered = readLocalStorage().filter((item) => item.id !== id);
    writeLocalStorage(filtered);
  } catch {
    activeEngine = 'localStorage';
    const filtered = readLocalStorage().filter((item) => item.id !== id);
    writeLocalStorage(filtered);
  }
}

export async function restoreLeads(
  incoming: Lead[],
  mode: 'merge' | 'replace'
): Promise<Lead[]> {
  let finalLeads: Lead[] = [];

  if (mode === 'replace') {
    finalLeads = incoming;
  } else {
    const { leads: existing } = await getAllLeads();
    const map = new Map<string, Lead>();
    for (const item of existing) {
      map.set(item.id, item);
    }
    for (const item of incoming) {
      const prev = map.get(item.id);
      if (!prev || item.updatedAt >= prev.updatedAt) {
        map.set(item.id, item);
      }
    }
    finalLeads = Array.from(map.values());
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      if (mode === 'replace') {
        store.clear();
      }
      for (const item of finalLeads) {
        store.put(item);
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
    activeEngine = 'IndexedDB';
  } catch {
    activeEngine = 'localStorage';
  }

  writeLocalStorage(finalLeads);
  return sortLeads(finalLeads);
}

export function getActiveStorageEngine(): 'IndexedDB' | 'localStorage' {
  return activeEngine;
}

function sortLeads(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}
