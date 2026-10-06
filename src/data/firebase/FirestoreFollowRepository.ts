import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { FollowRepository } from '../../domain/repositories/FollowRepository';
import { firestoreDb } from './firebaseApp';

/**
 * `users/{uid}/following/{target}` + `users/{target}/followers/{uid}` — voir
 * `FollowRepository` pour le contrat. Les deux documents sont écrits/supprimés
 * dans un même batch : jamais un abonnement vu d'un seul côté. `uid` est un
 * id Firebase Auth, toujours un segment de chemin Firestore valide (pas
 * d'encodage nécessaire, contrairement aux ids de livres).
 */
export class FirestoreFollowRepository implements FollowRepository {
  async follow(uid: string, targetUid: string): Promise<void> {
    const batch = writeBatch(firestoreDb);
    batch.set(doc(firestoreDb, 'users', uid, 'following', targetUid), { createdAt: serverTimestamp() });
    batch.set(doc(firestoreDb, 'users', targetUid, 'followers', uid), { createdAt: serverTimestamp() });
    await batch.commit();
  }

  async unfollow(uid: string, targetUid: string): Promise<void> {
    const batch = writeBatch(firestoreDb);
    batch.delete(doc(firestoreDb, 'users', uid, 'following', targetUid));
    batch.delete(doc(firestoreDb, 'users', targetUid, 'followers', uid));
    await batch.commit();
  }

  async fetchFollowingIds(uid: string): Promise<string[]> {
    const snapshot = await getDocs(collection(firestoreDb, 'users', uid, 'following'));
    return snapshot.docs.map((d) => d.id);
  }

  async fetchFollowerIds(uid: string): Promise<string[]> {
    const snapshot = await getDocs(collection(firestoreDb, 'users', uid, 'followers'));
    return snapshot.docs.map((d) => d.id);
  }
}
