import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import type { UserProfile } from '../../domain/entities/UserProfile';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
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
}
