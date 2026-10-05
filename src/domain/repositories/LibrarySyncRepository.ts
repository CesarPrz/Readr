import type { LibraryEntry } from '../entities/LibraryEntry';

/**
 * Port pour la synchronisation cloud de la bibliothèque (Phase 2 du plan
 * Firebase, doc Claude du projet). `upsertEntry`/`removeEntry` restent à sens
 * unique et best-effort : ils ne servent qu'à répliquer les écritures locales
 * vers Firestore, jamais attendus au premier plan (erreurs avalées, voir
 * `syncLibraryEntry`, `domain/usecases/`).
 *
 * `fetchAll`, elle, LIT Firestore — utilisée dans deux cas : (1)
 * `linkGoogleAccount` quand la liaison Google bascule vers un compte
 * existant, pour restaurer sa bibliothèque à la place de celle de la session
 * anonyme abandonnée ; (2) `refreshLibraryFromServer`, appelée au démarrage
 * et à l'ouverture de l'onglet Bibliothèque, pour que Firestore fasse foi en
 * continu (voir le plan Firebase, section "Le serveur fait foi" — revirement
 * par rapport à la décision initiale où le local était la seule source de
 * vérité pendant l'utilisation normale). Dans les deux cas le résultat
 * remplace la copie locale (`LibraryRepository.saveAll`), jamais de fusion.
 */
export interface LibrarySyncRepository {
  /** Écrit ou remplace l'entrée sous `users/{uid}/library/{bookId}`. */
  upsertEntry(uid: string, entry: LibraryEntry): Promise<void>;
  /** Supprime l'entrée correspondante côté cloud (no-op silencieux si elle n'existait pas). */
  removeEntry(uid: string, bookId: string): Promise<void>;
  /** Lit l'intégralité de la bibliothèque cloud d'un utilisateur — voir la doc ci-dessus pour les deux cas d'usage. */
  fetchAll(uid: string): Promise<LibraryEntry[]>;
}
