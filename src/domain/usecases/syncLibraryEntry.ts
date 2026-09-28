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
  if (!uid) return; // connexion anonyme pas encore résolue — tant pis pour cette fois, pas bloquant
  try {
    await repo.upsertEntry(uid, entry);
  } catch {
    // Échec silencieux volontaire — voir la doc de la fonction.
  }
}
