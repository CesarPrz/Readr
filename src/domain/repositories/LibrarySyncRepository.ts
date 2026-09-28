import type { LibraryEntry } from '../entities/LibraryEntry';

/**
 * Port pour la sauvegarde cloud de la bibliothèque (Phase 2 du plan Firebase,
 * doc Claude du projet). À sens unique et best-effort : `LibraryRepository`
 * (local, AsyncStorage) reste la seule source de vérité de l'app — cette
 * interface ne sert qu'à répliquer les écritures locales vers Firestore, et
 * ne définit volontairement aucune méthode de lecture. Pas de restauration/
 * hydratation depuis le cloud dans cette phase (voir `syncLibraryEntry`,
 * `domain/usecases/`, pour où les erreurs sont avalées).
 */
export interface LibrarySyncRepository {
  /** Écrit ou remplace l'entrée sous `users/{uid}/library/{bookId}`. */
  upsertEntry(uid: string, entry: LibraryEntry): Promise<void>;
  /** Supprime l'entrée correspondante côté cloud (no-op silencieux si elle n'existait pas). */
  removeEntry(uid: string, bookId: string): Promise<void>;
}
