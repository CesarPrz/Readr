import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import type { LibraryEntry } from '../../domain/entities/LibraryEntry';
import type { LibrarySyncRepository } from '../../domain/repositories/LibrarySyncRepository';
import { firestoreDb } from './firebaseApp';
import { toFirestoreLibraryEntry } from './mappers';

export class FirestoreLibraryRepository implements LibrarySyncRepository {
  async upsertEntry(uid: string, entry: LibraryEntry): Promise<void> {
    await setDoc(doc(firestoreDb, 'users', uid, 'library', entry.id), toFirestoreLibraryEntry(entry));
  }

  async removeEntry(uid: string, bookId: string): Promise<void> {
    await deleteDoc(doc(firestoreDb, 'users', uid, 'library', bookId));
  }
}
