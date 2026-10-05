import { doc, getDoc } from 'firebase/firestore';
import type { Book } from '../../domain/entities/Book';
import type { BookStatsRepository } from '../../domain/repositories/BookStatsRepository';
import { firestoreDb } from './firebaseApp';

/**
 * Même contrainte que `FirestoreLibraryRepository` (voir sa doc pour
 * l'historique complet du bug découvert le 05/10/2026) : un id de document
 * Firestore ne peut pas contenir de `/`, et `Book.id` (clé "œuvre" Open
 * Library, ex. `/works/OL136524W`) en contient systématiquement un. Même
 * fix, appliqué dès le départ ici plutôt que découvert après coup : encoder
 * l'id en segment de chemin valide à la lecture — la Cloud Function qui écrit
 * ces documents fait le même encodage côté écriture (voir
 * `functions/src/recomputeBookStats.ts`).
 */
function toFirestoreDocId(bookId: string): string {
  return encodeURIComponent(bookId);
}

// Forme exacte écrite par la Cloud Function (voir recomputeBookStats.ts) —
// un `Book` entièrement dénormalisé plus un compteur, pour que la lecture
// d'un seul document suffise à afficher ET ouvrir un livre associé, sans
// appel réseau supplémentaire.
type RelatedBookDoc = {
  id: string;
  title: string;
  authors: string[];
  coverId?: number | null;
  coverUrl?: string | null;
  description?: string | null;
  languages: string[];
  workKeys: string[];
  count: number;
};

export class FirestoreBookStatsRepository implements BookStatsRepository {
  async getRelatedBooks(bookId: string): Promise<Book[]> {
    try {
      const snapshot = await getDoc(doc(firestoreDb, 'bookStats', toFirestoreDocId(bookId)));
      if (!snapshot.exists()) return [];

      const data = snapshot.data() as { relatedTo?: RelatedBookDoc[] };
      return (data.relatedTo ?? [])
        .slice()
        .sort((a, b) => b.count - a.count) // la Cloud Function écrit déjà trié, mais on ne présume pas de l'ordre stocké
        .map((r) => ({
          id: r.id,
          workKeys: r.workKeys,
          title: r.title,
          authors: r.authors,
          coverId: r.coverId ?? undefined,
          coverUrl: r.coverUrl ?? undefined,
          description: r.description ?? undefined,
          languages: r.languages,
        }));
    } catch {
      return []; // best-effort, comme le reste de la synchronisation cloud — ne doit jamais casser Découvrir
    }
  }
}
