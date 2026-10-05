import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LibraryEntry } from '../../domain/entities/LibraryEntry';
import type { LibraryRepository } from '../../domain/repositories/LibraryRepository';
import { DEFAULT_LIST_IDS } from '../../domain/entities/ReadingList';

const STORAGE_KEY = '@readr/library';

// Anciennes entrées (avant les listes de lecture génériques, voir
// ReadingList.ts et le plan Firebase, section "Listes de lecture
// publiques") : un statut figé + un "aimé" indépendant au lieu d'un tableau
// `listIds`. Migrées à la lecture, une seule fois et silencieusement — pas
// d'écran ni d'action utilisateur nécessaire.
type LegacyStatus = 'to_read' | 'reading' | 'read';
type StoredEntry = LibraryEntry & { status?: LegacyStatus; liked?: boolean; listIds?: string[] };

const LEGACY_STATUS_TO_LIST_ID: Record<LegacyStatus, string> = {
  to_read: DEFAULT_LIST_IDS.toRead,
  reading: DEFAULT_LIST_IDS.reading,
  read: DEFAULT_LIST_IDS.read,
};

function migrateEntry(entry: StoredEntry): LibraryEntry {
  if (entry.listIds) return entry as LibraryEntry; // déjà au nouveau format
  const listIds: string[] = [];
  if (entry.status) listIds.push(LEGACY_STATUS_TO_LIST_ID[entry.status]);
  if (entry.liked) listIds.push(DEFAULT_LIST_IDS.liked);
  const migrated: LibraryEntry = { ...entry, listIds };
  delete (migrated as StoredEntry).status;
  delete (migrated as StoredEntry).liked;
  return migrated;
}

/** AsyncStorage implementation of the local library port — no backend, no sync. */
export class AsyncStorageLibraryRepository implements LibraryRepository {
  async getAll(): Promise<LibraryEntry[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(migrateEntry) : [];
    } catch {
      return []; // corrupted local data shouldn't crash the app — start fresh
    }
  }

  async saveAll(entries: LibraryEntry[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
}
