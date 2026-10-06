import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import type { LibraryEntry } from '../../domain/entities/LibraryEntry';
import type { ActivityFeedRepository } from '../../domain/repositories/ActivityFeedRepository';
import { firestoreDb } from './firebaseApp';
import { fromFirestoreLibraryEntry } from './mappers';

/**
 * `users/{uid}/library` trié par `activityAt` décroissant — voir
 * `ActivityFeedRepository`. Un seul champ trié : l'index automatique
 * mono-champ de Firestore suffit, aucun index composite à créer. Les
 * documents SANS `activityAt` sont ignorés par `orderBy` (voir
 * `toFirestoreLibraryEntry`, qui le renseigne pour toutes les entrées à la
 * prochaine sauvegarde en masse). Même décodage de l'id de document que
 * `FirestoreLibraryRepository.fetchAll` (`decodeURIComponent`).
 */
export class FirestoreActivityFeedRepository implements ActivityFeedRepository {
  async fetchRecentEntries(uid: string, max: number): Promise<LibraryEntry[]> {
    const snapshot = await getDocs(
      query(collection(firestoreDb, 'users', uid, 'library'), orderBy('activityAt', 'desc'), limit(max)),
    );
    return snapshot.docs.map((d) => fromFirestoreLibraryEntry(decodeURIComponent(d.id), d.data()));
  }
}
