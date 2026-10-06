import type { LibraryEntry } from '../src/domain/entities/LibraryEntry';
import type { ReadingList } from '../src/domain/entities/ReadingList';
import type { LibraryRepository } from '../src/domain/repositories/LibraryRepository';
import { DEFAULT_LIST_IDS } from '../src/domain/entities/ReadingList';

export function makeEntry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id: '/works/OL1W',
    workKeys: ['/works/OL1W'],
    title: 'Un livre',
    authors: ['Une autrice'],
    languages: ['fre'],
    listIds: [DEFAULT_LIST_IDS.toRead],
    addedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Les 4 listes par défaut, comme créées par `seedDefaultLists` (+ une liste perso). */
export function makeLists(): ReadingList[] {
  const createdAt = '2026-01-01T00:00:00.000Z';
  return [
    { id: DEFAULT_LIST_IDS.toRead, name: 'À lire', isDefault: true, exclusive: true, createdAt },
    { id: DEFAULT_LIST_IDS.reading, name: 'En cours', isDefault: true, exclusive: true, createdAt },
    { id: DEFAULT_LIST_IDS.read, name: 'Lu', isDefault: true, exclusive: true, createdAt },
    { id: DEFAULT_LIST_IDS.liked, name: 'Aimés', isDefault: true, exclusive: false, createdAt },
    { id: 'custom-1', name: 'SF', isDefault: false, exclusive: false, createdAt },
  ];
}

/** Dépôt local en mémoire : garde le dernier `saveAll` pour que les tests le relisent. */
export function fakeLibraryRepo(initial: LibraryEntry[] = []): LibraryRepository & { saved: LibraryEntry[] | null } {
  const repo = {
    saved: null as LibraryEntry[] | null,
    async getAll() {
      return repo.saved ?? initial;
    },
    async saveAll(entries: LibraryEntry[]) {
      repo.saved = entries;
    },
  };
  return repo;
}
