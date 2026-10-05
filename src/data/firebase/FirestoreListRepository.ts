import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import type { ReadingList } from '../../domain/entities/ReadingList';
import type { ListSyncRepository } from '../../domain/repositories/ListSyncRepository';
import { firestoreDb } from './firebaseApp';
import { fromFirestoreReadingList, toFirestoreReadingList } from './mappers';

export class FirestoreListRepository implements ListSyncRepository {
  async upsertList(uid: string, list: ReadingList): Promise<void> {
    await setDoc(doc(firestoreDb, 'users', uid, 'lists', list.id), toFirestoreReadingList(list));
  }

  async removeList(uid: string, listId: string): Promise<void> {
    await deleteDoc(doc(firestoreDb, 'users', uid, 'lists', listId));
  }

  async fetchAll(uid: string): Promise<ReadingList[]> {
    console.log('[Readr][debug bascule] FirestoreListRepository.fetchAll: getDocs sur users/', uid, '/lists');
    const snapshot = await getDocs(collection(firestoreDb, 'users', uid, 'lists'));
    console.log('[Readr][debug bascule] FirestoreListRepository.fetchAll: getDocs terminé,', snapshot.size, 'docs');
    return snapshot.docs.map((d) => fromFirestoreReadingList(d.id, d.data()));
  }
}
