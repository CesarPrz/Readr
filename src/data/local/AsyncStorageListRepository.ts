import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReadingList } from '../../domain/entities/ReadingList';
import type { ListRepository } from '../../domain/repositories/ListRepository';

const STORAGE_KEY = '@readr/lists';

/** AsyncStorage implementation of the local lists port — même pattern que AsyncStorageLibraryRepository. */
export class AsyncStorageListRepository implements ListRepository {
  async getAll(): Promise<ReadingList[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return []; // données locales corrompues : on repart de zéro plutôt que de planter
    }
  }

  async saveAll(lists: ReadingList[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  }
}
