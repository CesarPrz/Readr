import type { LibraryEntry } from '../entities/LibraryEntry';
import type { LibrarySyncRepository } from '../repositories/LibrarySyncRepository';

/**
 * Sauvegarde cloud d'une entrée de bibliothèque (Phase 2) — appelé depuis
 * `librarySlice` après chaque écriture locale réussie (ajout, changement de
 * statut/note/aimé), jamais à la place. Best-effort : comme `searchExcluding`
 * dans `getRecommendations`, une erreur (hors ligne, projet Firestore/règles
 * pas encore configurés côté console...) est avalée plutôt que remontée —
 * cette sauvegarde ne doit jamais faire échouer une action locale, qui reste
 * la source de vérité.
 */
export async function syncLibraryEntry(
  repo: LibrarySyncRepository,
  uid: string | undefined,
  entry: LibraryEntry,
): Promise<void> {
  if (!uid) {
    console.log('[Readr][debug sync] syncLibraryEntry: pas de uid, écriture ignorée pour', entry.id);
    return; // connexion anonyme pas encore résolue — tant pis pour cette fois, pas bloquant
  }
  try {
    console.log('[Readr][debug sync] syncLibraryEntry: upsertEntry', entry.id, 'pour uid', uid);
    await repo.upsertEntry(uid, entry);
    console.log('[Readr][debug sync] syncLibraryEntry: upsertEntry réussi', entry.id);
  } catch (error) {
    // Échec silencieux volontaire pour l'appelant — voir la doc de la
    // fonction — mais loggé pour le diagnostic (temporaire).
    console.log('[Readr][debug sync] syncLibraryEntry: upsertEntry a échoué pour', entry.id, ':', error);
  }
}
