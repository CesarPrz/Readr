import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import type { LibraryEntry } from '../../domain/entities/LibraryEntry';
import type { LibrarySyncRepository } from '../../domain/repositories/LibrarySyncRepository';
import { firestoreDb } from './firebaseApp';
import { fromFirestoreLibraryEntry, toFirestoreLibraryEntry } from './mappers';

/**
 * `LibraryEntry.id`/`Book.id` est la clé "œuvre" du catalogue (ex. Open
 * Library : `/works/OL136524W`, avec un `/` intégré) — jamais un identifiant
 * "plat". Un id Firestore ne peut pas contenir de `/` : utilisé tel quel
 * comme segment de chemin, Firestore le découpe en segments supplémentaires
 * et refuse l'écriture (`FirebaseError: Invalid document reference ... must
 * have an even number of segments`). **Bug rencontré en pratique, resté
 * invisible depuis la Phase 2** : `syncLibraryEntry` avale silencieusement
 * cette erreur (best-effort, voir sa doc), donc AUCUN livre Open Library
 * (le cas normal, la totalité des clés commencent par `/works/`) n'a jamais
 * été réellement sauvegardé sur Firestore jusqu'ici — seul l'ajout récent de
 * logs de diagnostic (`[Readr][debug sync]`) l'a rendu visible.
 *
 * Fix : encoder l'id en toute sécurité pour en faire un segment de chemin
 * Firestore valide (`encodeURIComponent`, réversible), décoder symétriquement
 * à la lecture (`fetchAll`) pour retrouver l'id d'origine exact — l'id
 * applicatif (`LibraryEntry.id`) ne change pas, seul l'id DU DOCUMENT
 * Firestore diffère de lui.
 */
function toFirestoreDocId(entryId: string): string {
  return encodeURIComponent(entryId);
}

export class FirestoreLibraryRepository implements LibrarySyncRepository {
  async upsertEntry(uid: string, entry: LibraryEntry): Promise<void> {
    await setDoc(doc(firestoreDb, 'users', uid, 'library', toFirestoreDocId(entry.id)), toFirestoreLibraryEntry(entry));
  }

  async removeEntry(uid: string, bookId: string): Promise<void> {
    await deleteDoc(doc(firestoreDb, 'users', uid, 'library', toFirestoreDocId(bookId)));
  }

  async fetchAll(uid: string): Promise<LibraryEntry[]> {
    console.log('[Readr][debug bascule] FirestoreLibraryRepository.fetchAll: getDocs sur users/', uid, '/library');
    const snapshot = await getDocs(collection(firestoreDb, 'users', uid, 'library'));
    console.log('[Readr][debug bascule] FirestoreLibraryRepository.fetchAll: getDocs terminé,', snapshot.size, 'docs');
    return snapshot.docs.map((d) => fromFirestoreLibraryEntry(decodeURIComponent(d.id), d.data()));
  }
}
