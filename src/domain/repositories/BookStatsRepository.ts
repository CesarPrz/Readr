import type { Book } from '../entities/Book';

/**
 * Statistiques communautaires pré-calculées côté serveur — "les lecteurs qui
 * ont aimé/lu ce livre ont aussi aimé/lu ces autres livres". Calculées par
 * une Cloud Function planifiée (`functions/src/recomputeBookStats.ts`) à
 * partir des bibliothèques "aimés"/"lus" de TOUS les utilisateurs (déjà
 * publiques en lecture, voir "Listes de lecture publiques") — jamais
 * calculées ni écrites depuis le client, voir `firestore.rules`
 * (`bookStats/{bookId}` : lecture publique, écriture refusée à tout le
 * monde côté client).
 *
 * Décision produit (voir le plan Firebase, doc Claude du projet, section
 * "Recommandations collaboratives") : une seule implémentation pour
 * l'instant (`FirestoreBookStatsRepository`), mais ce port existe quand même
 * en toute rigueur — c'est une source de données à part entière (règle 5,
 * CLAUDE.md), distincte de `BookRepository` (qui ne parle qu'à Open
 * Library/Google Books/BnF, jamais à Firestore).
 */
export interface BookStatsRepository {
  /**
   * Livres associés à `bookId`, triés par force d'association décroissante.
   * Tableau vide si ce livre n'a pas encore de statistiques (jamais recalculé
   * depuis son ajout, ou jamais co-aimé/co-lu avec un autre livre par
   * personne) — jamais d'erreur, best-effort comme le reste de la
   * synchronisation cloud.
   */
  getRelatedBooks(bookId: string): Promise<Book[]>;
}
