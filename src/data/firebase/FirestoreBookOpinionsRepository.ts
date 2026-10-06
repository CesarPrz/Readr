import { collection, getDocs, query, where } from 'firebase/firestore';
import type { LibraryEntry } from '../../domain/entities/LibraryEntry';
import type { BookOpinionsRepository } from '../../domain/repositories/BookOpinionsRepository';
import { firestoreDb } from './firebaseApp';
import { fromFirestoreLibraryEntry } from './mappers';

/** Limite Firestore de `array-contains-any` : au plus 30 valeurs. */
const MAX_WORK_KEYS = 30;

/**
 * `users/{uid}/library` filtré sur `workKeys array-contains-any [...]` — voir
 * `BookOpinionsRepository`. Une seule requête par lecteur (facturée par
 * document renvoyé, soit 0 ou 1 en pratique), index automatique mono-champ :
 * aucun index composite à créer. Couvert par la lecture publique déjà en
 * place sur `users/{uid}/library` (`allow read`, valable pour une requête).
 * Une entrée ancienne dont `workKeys` n'a jamais atteint Firestore n'est pas
 * trouvée — la sauvegarde en masse du démarrage (`syncLibraryToCloud`) les
 * réécrit toutes, donc elles se rattrapent au prochain lancement de leur
 * propriétaire.
 */
export class FirestoreBookOpinionsRepository implements BookOpinionsRepository {
  async fetchEntriesByWorkKeys(uid: string, workKeys: string[]): Promise<LibraryEntry[]> {
    const keys = Array.from(new Set(workKeys)).slice(0, MAX_WORK_KEYS);
    if (keys.length === 0) return [];
    const snapshot = await getDocs(
      query(collection(firestoreDb, 'users', uid, 'library'), where('workKeys', 'array-contains-any', keys)),
    );
    return snapshot.docs.map((d) => fromFirestoreLibraryEntry(decodeURIComponent(d.id), d.data()));
  }
}
