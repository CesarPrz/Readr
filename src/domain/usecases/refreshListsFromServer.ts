import type { ReadingList } from '../entities/ReadingList';
import type { ListRepository } from '../repositories/ListRepository';
import type { ListSyncRepository } from '../repositories/ListSyncRepository';

/** Pendant de `refreshLibraryFromServer` pour les listes de lecture — même besoin, mêmes règles (dont `shouldApply`), voir sa doc. */
export async function refreshListsFromServer(
  listSyncRepo: ListSyncRepository,
  listRepo: ListRepository,
  uid: string | undefined,
  shouldApply: () => boolean,
): Promise<ReadingList[] | null> {
  if (!uid) return null;
  try {
    const lists = await listSyncRepo.fetchAll(uid);
    if (!shouldApply()) {
      console.log(
        '[Readr][debug sync] refreshListsFromServer: résultat ignoré (une mutation locale a eu lieu pendant le cycle push/pull)',
      );
      return null;
    }
    await listRepo.saveAll(lists);
    return lists;
  } catch {
    return null;
  }
}
