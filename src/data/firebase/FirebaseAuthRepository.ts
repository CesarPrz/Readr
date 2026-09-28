import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  type User,
} from 'firebase/auth';
import type { UserProfile } from '../../domain/entities/UserProfile';
import { CredentialAlreadyInUseError, type AuthRepository } from '../../domain/repositories/AuthRepository';
import { firebaseAuth } from './firebaseApp';
import { toUserProfile } from './mappers';

export class FirebaseAuthRepository implements AuthRepository {
  private current: User | null = null;

  // La persistance AsyncStorage (voir firebaseApp.ts) restaure une session
  // existante de façon asynchrone : `firebaseAuth.currentUser` peut encore
  // valoir `null` juste après le démarrage même si un utilisateur anonyme a
  // déjà été créé lors d'un lancement précédent. `onAuthStateChanged` se
  // déclenche une première fois dès que Firebase a fini cette restauration
  // (avec l'utilisateur restauré, ou `null` s'il n'y en a vraiment aucun) —
  // c'est ce premier signal qu'on attend avant de décider de créer un nouvel
  // utilisateur anonyme, sinon on en créerait un nouveau à chaque démarrage
  // au lieu de retrouver le précédent.
  private readonly initialAuthState: Promise<User | null>;

  constructor() {
    let resolveInitial!: (user: User | null) => void;
    this.initialAuthState = new Promise((resolve) => {
      resolveInitial = resolve;
    });

    let isFirstCallback = true;
    onAuthStateChanged(firebaseAuth, (user) => {
      this.current = user;
      if (isFirstCallback) {
        isFirstCallback = false;
        resolveInitial(user);
      }
    });
  }

  async ensureSignedIn(): Promise<UserProfile> {
    const restored = await this.initialAuthState;
    if (restored) return toUserProfile(restored);

    const credential = await signInAnonymously(firebaseAuth);
    return toUserProfile(credential.user);
  }

  getCurrentUser(): UserProfile | null {
    return this.current ? toUserProfile(this.current) : null;
  }

  async linkWithGoogle(idToken: string): Promise<UserProfile> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      // Ne devrait pas arriver : l'app appelle toujours `ensureSignedIn` au
      // démarrage (voir App.tsx) avant qu'aucun écran ne soit accessible.
      throw new Error('Aucune session active à lier — ensureSignedIn() aurait dû être résolu au démarrage.');
    }

    try {
      const result = await linkWithCredential(user, GoogleAuthProvider.credential(idToken));
      return toUserProfile(result.user);
    } catch (error) {
      // Ce compte Google est déjà associé à un AUTRE utilisateur Firebase
      // (ex. app réinstallée, ou compte déjà lié sur un autre appareil).
      // Convertit l'erreur brute Firebase en type domain dédié — voir
      // `CredentialAlreadyInUseError`. Pas de tentative de fusion des
      // bibliothèques ici (non prise en charge, voir doc Claude du projet,
      // "firebase-social-plan") : on laisse l'appelant décider quoi afficher.
      if (error instanceof FirebaseError && error.code === 'auth/credential-already-in-use') {
        throw new CredentialAlreadyInUseError();
      }
      throw error;
    }
  }

  async signOutCurrentUser(): Promise<void> {
    await signOut(firebaseAuth);
  }
}
