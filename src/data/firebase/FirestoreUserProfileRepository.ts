import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { PublicUserProfile, UserProfileRepository } from '../../domain/repositories/UserProfileRepository';
import { normalizeForUserSearch } from '../../utils/userSearch';
import { firestoreDb } from './firebaseApp';

/**
 * `users/{uid}` — voir `UserProfileRepository` pour le contrat complet.
 * Pas de contrainte d'encodage d'id ici (contrairement à `library`/
 * `bookStats`) : `uid` est déjà un id Firebase Auth, toujours un segment de
 * chemin Firestore valide.
 */
export class FirestoreUserProfileRepository implements UserProfileRepository {
  async fetchProfile(uid: string): Promise<PublicUserProfile | null> {
    try {
      const snapshot = await getDoc(doc(firestoreDb, 'users', uid));
      if (!snapshot.exists()) return null;

      const data = snapshot.data();
      const username = typeof data.username === 'string' ? data.username : '';
      return {
        username,
        searchIndexed: username !== '' && data.usernameSearch === normalizeForUserSearch(username),
        photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : undefined,
        bio: typeof data.bio === 'string' ? data.bio : undefined,
      };
    } catch {
      return null; // best-effort, voir la doc du port — jamais bloquant pour l'utilisateur
    }
  }

  async upsertProfile(uid: string, patch: Partial<PublicUserProfile>): Promise<void> {
    try {
      // `{ merge: true }` : une mise à jour du pseudo ne doit jamais effacer
      // une photo déjà publiée (ou inversement) — chaque appelant ne fournit
      // que les champs qu'il modifie (voir `updateUsername.ts`,
      // `syncProfilePhotoToCloud.ts`). `?? null` : Firestore refuse
      // `undefined` comme valeur de champ, même méthode que
      // `toFirestoreLibraryEntry` (voir mappers.ts).
      await setDoc(
        doc(firestoreDb, 'users', uid),
        {
          ...('username' in patch
            ? { username: patch.username, usernameSearch: normalizeForUserSearch(patch.username ?? '') }
            : {}),
          ...('photoUrl' in patch ? { photoUrl: patch.photoUrl ?? null } : {}),
          ...('bio' in patch ? { bio: patch.bio ?? null } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch {
      // best-effort — voir la doc du port ; l'appelant reste quand même
      // à jour localement (mise à jour optimiste côté Redux, voir authSlice).
    }
  }

  async ensureSearchable(uid: string, defaultUsername: string): Promise<void> {
    try {
      const ref = doc(firestoreDb, 'users', uid);
      // Lecture DIRECTE ici (pas `fetchProfile`) : on doit distinguer
      // "document absent" d'une erreur réseau — une erreur lève et sort par
      // le catch, sans jamais écrire. Voir la doc du port.
      const snapshot = await getDoc(ref);
      const data = snapshot.exists() ? snapshot.data() : undefined;
      const existing = typeof data?.username === 'string' ? data.username : '';
      const username = existing || defaultUsername;
      const usernameSearch = normalizeForUserSearch(username);
      if (existing && data?.usernameSearch === usernameSearch) return; // déjà trouvable, rien à écrire

      await setDoc(ref, { username, usernameSearch, updatedAt: serverTimestamp() }, { merge: true });
    } catch {
      // best-effort — réessayé au prochain démarrage tant que `searchIndexed` reste faux
    }
  }
}
