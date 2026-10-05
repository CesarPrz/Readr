import type { ListSyncRepository } from '../repositories/ListSyncRepository';

/** Pendant de `removeLibraryEntryFromCloud` pour une liste — même contrat, voir sa doc. */
export async function removeListFromCloud(
  repo: ListSyncRepository,
  uid: string | undefined,
  listId: string,
): Promise<void> {
  if (!uid) return;
  try {
    await repo.removeList(uid, listId);
  } catch {
    // Échec silencieux volontaire — voir syncLibraryEntry.
  }
}
