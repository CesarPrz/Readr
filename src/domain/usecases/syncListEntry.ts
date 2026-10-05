import type { ReadingList } from '../entities/ReadingList';
import type { ListSyncRepository } from '../repositories/ListSyncRepository';

/** Pendant de `syncLibraryEntry` pour une liste — même contrat best-effort silencieux, voir sa doc. */
export async function syncListEntry(
  repo: ListSyncRepository,
  uid: string | undefined,
  list: ReadingList,
): Promise<void> {
  if (!uid) {
    console.log('[Readr][debug sync] syncListEntry: pas de uid, écriture ignorée pour', list.id);
    return; // connexion anonyme pas encore résolue — tant pis pour cette fois, pas bloquant
  }
  try {
    console.log('[Readr][debug sync] syncListEntry: upsertList', list.id, 'pour uid', uid);
    await repo.upsertList(uid, list);
    console.log('[Readr][debug sync] syncListEntry: upsertList réussi', list.id);
  } catch (error) {
    // Échec silencieux volontaire pour l'appelant, loggé pour le diagnostic (temporaire).
    console.log('[Readr][debug sync] syncListEntry: upsertList a échoué pour', list.id, ':', error);
  }
}
