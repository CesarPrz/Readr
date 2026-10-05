import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signOut,
  type User,
} from 'firebase/auth';
import type { UserProfile } from '../../domain/entities/UserProfile';
import type { AuthRepository, LinkGoogleOutcome } from '../../domain/repositories/AuthRepository';
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

  async linkWithGoogle(idToken: string): Promise<LinkGoogleOutcome> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      // Ne devrait pas arriver : l'app appelle toujours `ensureSignedIn` au
      // démarrage (voir App.tsx) avant qu'aucun écran ne soit accessible.
      throw new Error('Aucune session active à lier — ensureSignedIn() aurait dû être résolu au démarrage.');
    }

    console.log('[Readr][debug bascule] linkWithGoogle: tentative linkWithCredential sur uid', user.uid);
    try {
      const result = await linkWithCredential(user, GoogleAuthProvider.credential(idToken));
      console.log('[Readr][debug bascule] linkWithCredential réussi, même uid', result.user.uid);
      return { profile: toUserProfile(result.user), switchedToExistingAccount: false };
    } catch (error) {
      console.log(
        '[Readr][debug bascule] linkWithCredential a échoué :',
        error instanceof FirebaseError ? error.code : error,
      );
      // Ce compte Google est déjà associé à un AUTRE utilisateur Firebase
      // (ex. app réinstallée, ou compte déjà lié sur un autre appareil) :
      // plutôt que d'échouer (ancien comportement, voir la doc de
      // `AuthRepository.linkWithGoogle`), on connecte directement la session
      // à ce compte existant — `signInWithCredential` (pas `linkWithCredential`)
      // abandonne la session anonyme courante au profit de celle déjà
      // associée à ce compte Google. C'est très probablement le même
      // utilisateur (app réinstallée, nouvel appareil) : Google a déjà
      // vérifié son identité pour nous. Credential recréée à partir du même
      // idToken (pas la même instance que celle consommée par la tentative
      // ci-dessus) par prudence.
      if (error instanceof FirebaseError && error.code === 'auth/credential-already-in-use') {
        console.log('[Readr][debug bascule] tentative signInWithCredential sur le compte existant...');
        const result = await signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(idToken));
        console.log('[Readr][debug bascule] signInWithCredential réussi, nouveau uid', result.user.uid);
        return { profile: toUserProfile(result.user), switchedToExistingAccount: true };
      }
      // Cas de reprise : un essai précédent a déjà basculé cette session sur
      // le compte existant (branche ci-dessus) mais la restauration Firestore
      // qui suit (voir `linkGoogleAccount`) a échoué ensuite — ex. règles pas
      // encore publiées au moment du premier essai — avant que l'état Redux
      // n'ait pu être mis à jour (il n'est mis à jour qu'au succès complet du
      // usecase). `firebaseAuth.currentUser` porte donc déjà ce compte
      // existant, Google y est déjà lié : retenter `linkWithCredential`
      // échoue avec `auth/provider-already-linked`, pas avec
      // `credential-already-in-use` (l'erreur diffère parce que cette fois
      // c'est le même utilisateur courant qui a déjà ce fournisseur, pas un
      // autre). On traite ce cas comme une bascule déjà faite — `user` (capturé
      // en haut de la méthode) EST déjà ce compte, inutile de rappeler
      // `signInWithCredential` — pour que `linkGoogleAccount` retente juste la
      // restauration Firestore.
      if (error instanceof FirebaseError && error.code === 'auth/provider-already-linked') {
        console.log('[Readr][debug bascule] déjà basculé lors d’un essai précédent, reprise sur uid', user.uid);
        return { profile: toUserProfile(user), switchedToExistingAccount: true };
      }
      throw error;
    }
  }

  async signOutCurrentUser(): Promise<void> {
    await signOut(firebaseAuth);
  }
}
