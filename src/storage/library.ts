import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BookSummary } from '../api/types';

export type ReadingStatus = 'to_read' | 'reading' | 'read';

export type LibraryEntry = {
  id: string; // Open Library work key, doubles as the unique id
  title: string;
  authors: string[];
  coverId?: number;
  status: ReadingStatus;
  rating?: number; // 1–5, optional
  note?: string;
  addedAt: string; // ISO date string
};

const STORAGE_KEY = '@readr/library';

export async function loadLibrary(): Promise<LibraryEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupted local data shouldn't crash the app — start fresh.
    return [];
  }
}

export async function saveLibrary(entries: LibraryEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function summaryToEntry(summary: BookSummary, status: ReadingStatus = 'to_read'): LibraryEntry {
  return {
    id: summary.workKey,
    title: summary.title,
    authors: summary.authors,
    coverId: summary.coverId,
    status,
    addedAt: new Date().toISOString(),
  };
}
