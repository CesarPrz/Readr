import type { LibraryEntry } from '../entities/LibraryEntry';
import type { ReadingList } from '../entities/ReadingList';
import type { LibraryRepository } from '../repositories/LibraryRepository';
import type { ListRepository } from '../repositories/ListRepository';

/**
 * Supprime une liste perso — no-op sur une liste par défaut (voir
 * ReadingList.isDefault). Retire aussi cette liste de `listIds` sur tous les
 * livres concernés (jamais le livre lui-même, seulement son appartenance à
 * cette liste), pour ne pas laisser d'id orphelin. Orchestre les deux
 * repositories (listes + bibliothèque) dans un seul usecase plutôt que dans
 * le thunk — même esprit que `linkGoogleAccount`, qui orchestre 5 ports
 * domain pour une seule action utilisateur (voir sa doc).
 */
export async function deleteReadingList(
  listRepo: ListRepository,
  libraryRepo: LibraryRepository,
  currentLists: ReadingList[],
  currentEntries: LibraryEntry[],
  listId: string,
): Promise<{ lists: ReadingList[]; entries: LibraryEntry[] }> {
  const target = currentLists.find((l) => l.id === listId);
  if (!target || target.isDefault) return { lists: currentLists, entries: currentEntries };

  const nextLists = currentLists.filter((l) => l.id !== listId);
  const nextEntries = currentEntries.map((e) =>
    e.listIds.includes(listId) ? { ...e, listIds: e.listIds.filter((id) => id !== listId) } : e,
  );
  await Promise.all([listRepo.saveAll(nextLists), libraryRepo.saveAll(nextEntries)]);
  return { lists: nextLists, entries: nextEntries };
}
