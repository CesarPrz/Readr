import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LibraryEntry } from '../../domain/entities/LibraryEntry';
import type { LibraryRepository } from '../../domain/repositories/LibraryRepository';

const STORAGE_KEY = '@readr/library';

/** AsyncStorage implementation of the local library port — no backend, no sync. */
export class AsyncStorageLibraryRepository implements LibraryRepository {
  async getAll(): Promise<LibraryEntry[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return []; // corrupted local data shouldn't crash the app — start fresh
    }
  }

  async saveAll(entries: LibraryEntry[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
}
