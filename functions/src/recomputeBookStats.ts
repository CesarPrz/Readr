import * as admin from 'firebase-admin';

/**
 * Forme (partielle) d'un document `users/{uid}/library/{bookId}` tel
 * qu'écrit par `FirestoreLibraryRepository` côté app — voir
 * `src/data/firebase/mappers.ts` dans le projet principal. On ne lit ici que
 * les champs dont cette Cloud Function a besoin.
 */
type LibraryEntryDoc = {
  listIds?: string[];
  title?: string;
  authors?: string[];
  coverId?: number;
  coverUrl?: string;
  description?: string;
  languages?: string[];
  workKeys?: string[];
};

type BookInfo = LibraryEntryDoc & { id: string };

const LIKED_LIST_ID = 'default-liked';
const READ_LIST_ID = 'default-read';
const MAX_RELATED_PER_BOOK = 8;
const FIRESTORE_BATCH_LIMIT = 450; // marge sous la limite Firestore de 500 écritures par batch

/**
 * Cœur du calcul des recommandations collaboratives — voir le plan Firebase,
 * doc Claude du projet, section "Recommandations collaboratives", pour la
 * décision produit complète. Partagé entre le déclencheur planifié et le
 * déclencheur manuel de test (voir index.ts).
 *
 * Principe : parcourt la bibliothèque "aimée"/"lue" de CHAQUE utilisateur
 * (`collectionGroup('library')`, lecture déjà publique côté règles
 * Firestore — le SDK Admin les ignore de toute façon), compte les
 * co-occurrences entre livres qu'une même personne a aimés/lus (la
 * co-occurrence ne compte JAMAIS entre deux utilisateurs différents), puis
 * écrit pour chaque livre concerné ses quelques livres les plus souvent
 * associés dans `bookStats/{bookId encodé}`.
 *
 * Id de document Firestore : même contrainte que `FirestoreLibraryRepository`
 * côté app — un id de document ne peut pas contenir de `/`, et l'id
 * applicatif d'un livre (clé "œuvre" Open Library, ex. `/works/OL123W`) en
 * contient systématiquement un. Encodé ici à l'écriture
 * (`encodeURIComponent`), décodé symétriquement à la lecture des documents
 * `library` (`decodeURIComponent(doc.id)`) — voir
 * `FirestoreBookStatsRepository` côté app pour le décodage en sens inverse.
 *
 * Volontairement tout en mémoire (une seule lecture complète, puis des Map),
 * sans pagination ni streaming : à l'échelle personnelle/portfolio de ce
 * projet (au plus quelques dizaines d'utilisateurs et de livres), le jeu de
 * données complet tient très largement en mémoire pour une Cloud
 * Function — pas la peine de complexifier pour un volume qui n'existera pas.
 */
export async function recomputeBookStats(
  db: admin.firestore.Firestore,
): Promise<{ usersConsidered: number; booksWithStats: number }> {
  const snapshot = await db.collectionGroup('library').get();

  // Regroupe les livres "aimés"/"lus" par utilisateur.
  const byUser = new Map<string, Map<string, BookInfo>>();

  for (const doc of snapshot.docs) {
    const data = doc.data() as LibraryEntryDoc;
    const listIds = data.listIds ?? [];
    if (!listIds.includes(LIKED_LIST_ID) && !listIds.includes(READ_LIST_ID)) continue;

    const uid = doc.ref.parent.parent?.id;
    if (!uid) continue; // ne devrait jamais arriver : doc.ref est toujours users/{uid}/library/{bookId}

    const id = decodeURIComponent(doc.id);
    if (!byUser.has(uid)) byUser.set(uid, new Map());
    byUser.get(uid)!.set(id, { ...data, id });
  }

  // Compte les co-occurrences : pour chaque paire de livres aimés/lus par une
  // même personne, +1 dans les deux sens (symétrique).
  const pairCounts = new Map<string, Map<string, number>>();
  const bookInfo = new Map<string, BookInfo>();

  for (const entries of byUser.values()) {
    const books = [...entries.values()];
    for (const book of books) {
      if (!bookInfo.has(book.id)) bookInfo.set(book.id, book);
    }

    for (let i = 0; i < books.length; i += 1) {
      for (let j = i + 1; j < books.length; j += 1) {
        bump(pairCounts, books[i].id, books[j].id);
        bump(pairCounts, books[j].id, books[i].id);
      }
    }
  }

  // Écrit un document par livre qui a au moins une association — jamais de
  // document vide, dans l'esprit du reste de l'app ("pas de groupe vide").
  let batch = db.batch();
  let opsInBatch = 0;
  let booksWithStats = 0;

  for (const [bookId, related] of pairCounts) {
    const top = [...related.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_RELATED_PER_BOOK)
      .map(([relatedId, count]) => {
        const info = bookInfo.get(relatedId);
        return {
          id: relatedId,
          title: info?.title ?? '',
          authors: info?.authors ?? [],
          coverId: info?.coverId ?? null,
          coverUrl: info?.coverUrl ?? null,
          description: info?.description ?? null,
          languages: info?.languages ?? [],
          workKeys: info?.workKeys ?? [],
          count,
        };
      });

    if (top.length === 0) continue;

    const ref = db.collection('bookStats').doc(encodeURIComponent(bookId));
    batch.set(ref, { relatedTo: top, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    booksWithStats += 1;
    opsInBatch += 1;

    if (opsInBatch >= FIRESTORE_BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) await batch.commit();

  return { usersConsidered: byUser.size, booksWithStats };
}

function bump(pairCounts: Map<string, Map<string, number>>, a: string, b: string): void {
  if (!pairCounts.has(a)) pairCounts.set(a, new Map());
  const inner = pairCounts.get(a)!;
  inner.set(b, (inner.get(b) ?? 0) + 1);
}
