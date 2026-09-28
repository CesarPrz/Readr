import type { LibraryEntry } from '../entities/LibraryEntry';
import type { LibrarySyncRepository } from '../repositories/LibrarySyncRepository';
import { syncLibraryEntry } from './syncLibraryEntry';

/**
 * Sauvegarde en masse de toute la bibliothèque locale vers Firestore —
 * appelé une seule fois au démarrage (voir `App.tsx`), une fois la
 * bibliothèque locale chargée et la connexion anonyme résolue. Couvre aussi
 * les entrées ajoutées avant l'existence de la Phase 2 : sans ce passage
 * initial, seules les futures modifications seraient sauvegardées, jamais ce
 * qui existait déjà. Best-effort comme `syncLibraryEntry` : chaque entrée est
 * indépendante, l'échec de l'une n'empêche pas les autres.
 */
export async function syncLibraryToCloud(
  repo: LibrarySyncRepository,
  uid: string | undefined,
  entries: LibraryEntry[],
): Promise<void> {
  if (!uid) return;
  await Promise.all(entries.map((entry) => syncLibraryEntry(repo, uid, entry)));
}
