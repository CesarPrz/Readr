import type { ReadingList } from '../entities/ReadingList';
import type { ListSyncRepository } from '../repositories/ListSyncRepository';
import { syncListEntry } from './syncListEntry';

/** Pendant de `syncLibraryToCloud` pour les listes — même besoin (rattraper ce qui existait avant/sans cette sauvegarde), voir sa doc. */
export async function syncListsToCloud(
  repo: ListSyncRepository,
  uid: string | undefined,
  lists: ReadingList[],
): Promise<void> {
  if (!uid) return;
  await Promise.all(lists.map((list) => syncListEntry(repo, uid, list)));
}
