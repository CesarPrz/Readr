import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  authRepository,
  googleIdentityProvider,
  libraryRepository,
  librarySyncRepository,
  listRepository,
  listSyncRepository,
  userProfileRepository,
} from '../composition/repositories';
import type { UserProfile } from '../domain/entities/UserProfile';
import { ensureSignedIn as ensureSignedInUseCase } from '../domain/usecases/ensureSignedIn';
import {
  linkGoogleAccount as linkGoogleAccountUseCase,
  type LinkGoogleAccountResult,
} from '../domain/usecases/linkGoogleAccount';
import { loadUserProfile as loadUserProfileUseCase } from '../domain/usecases/loadUserProfile';
import { signOutUser as signOutUserUseCase } from '../domain/usecases/signOutUser';
import { syncProfilePhotoToCloud as syncProfilePhotoToCloudUseCase } from '../domain/usecases/syncProfilePhotoToCloud';
import { updateUsername as updateUsernameUseCase } from '../domain/usecases/updateUsername';
import { setLibraryEntries } from './librarySlice';
import { setLists } from './listsSlice';
import type { RootState } from './store';

type AuthState = {
  user: UserProfile | null;
  status: 'idle' | 'loading' | 'error';
  // État séparé de `status` : la liaison Google (Phase 3) est déclenchée par
  // un geste explicite sur l'écran Profil, pas au démarrage — mélanger les
  // deux ferait passer `status` en 'loading' pour une action qui n'a rien à
  // voir avec `ensureSignedIn`.
  googleLinkStatus: 'idle' | 'loading' | 'error';
  googleLinkError: string | null;
};

const initialState: AuthState = {
  user: null,
  status: 'idle',
  googleLinkStatus: 'idle',
  googleLinkError: null,
};

// Dispatché silencieusement au démarrage de l'app (voir App.tsx) — jamais en
// réaction à une action de l'utilisateur, conformément au principe UX de
// connexion non intrusive.
export const ensureSignedIn = createAsyncThunk('auth/ensureSignedIn', () => ensureSignedInUseCase(authRepository));

/**
 * Charge le pseudo public (`username`, "Profil fusionné", voir
 * `loadUserProfile.ts`) une fois `ensureSignedIn` résolu — a besoin du `uid`
 * déjà dans l'état, donc dispatché juste après lui (voir App.tsx), jamais en
 * parallèle. Distinct d'`ensureSignedIn` : un échec ici (Firestore
 * injoignable) ne doit jamais empêcher la connexion anonyme elle-même de
 * réussir, qui reste la fondation de tout le reste.
 */
export const loadUserProfile = createAsyncThunk('auth/loadUserProfile', (_: void, { getState }) => {
  const uid = (getState() as RootState).auth.user?.uid;
  if (!uid) throw new Error('loadUserProfile appelé avant ensureSignedIn — ne devrait jamais arriver.');
  return loadUserProfileUseCase(userProfileRepository, uid);
});

/**
 * Change le pseudo public affiché partout (profil fusionné, futur profil
 * visible par d'autres utilisateurs) — déclenché uniquement par une édition
 * explicite sur `ProfileHeader`. Mise à jour optimiste dès `.pending` (voir
 * `extraReducers` plus bas) : l'écriture Firestore elle-même est best-effort
 * (voir `updateUsername.ts`), jamais sur le chemin critique de l'affichage.
 */
export const updateUsername = createAsyncThunk('auth/updateUsername', (rawUsername: string, { getState }) => {
  const uid = (getState() as RootState).auth.user?.uid;
  if (!uid) throw new Error('updateUsername appelé sans utilisateur courant — ne devrait jamais arriver.');
  return updateUsernameUseCase(userProfileRepository, uid, rawUsername);
});

// Déclenché uniquement par le bouton "Se connecter avec Google" de l'écran
// Profil (Phase 3) — jamais automatiquement. `status: 'cancelled'` = annulé
// par l'utilisateur (pas une erreur), voir le usecase `linkGoogleAccount`
// pour le détail des 3 résultats possibles. Si `status: 'switched'` (compte
// déjà utilisé par un autre profil Readr, bascule automatique vers ce
// compte existant + restauration depuis Firestore), on répercute les
// données restaurées dans les slices `library`/`lists` via des actions
// simples — même pattern que `listsSlice.deleteList` → `setLibraryEntries`
// (CLAUDE.md, règle 7, exceptions documentées).
export const linkGoogleAccount = createAsyncThunk<LinkGoogleAccountResult, void>(
  'auth/linkGoogleAccount',
  async (_arg, { dispatch }) => {
    console.log('[Readr][debug bascule] authSlice.linkGoogleAccount: thunk démarré');
    const result = await linkGoogleAccountUseCase(
      googleIdentityProvider,
      authRepository,
      libraryRepository,
      listRepository,
      librarySyncRepository,
      listSyncRepository,
    );
    console.log('[Readr][debug bascule] authSlice.linkGoogleAccount: usecase résolu, status =', result.status);
    if (result.status === 'switched') {
      dispatch(setLibraryEntries(result.entries));
      dispatch(setLists(result.lists));
    }
    if (result.status !== 'cancelled') {
      // Le pseudo public est lié au `uid`, pas au compte Google lui-même :
      // pour `switched` (uid différent de la session anonyme abandonnée), le
      // pseudo affiché doit être celui DE CE COMPTE EXISTANT, jamais celui —
      // désormais obsolète — de la session qu'on vient de quitter. Pour
      // `linked` (même uid), ce rechargement retombe simplement sur le
      // pseudo déjà en mémoire : coût négligeable, et ça évite une branche
      // séparée pour un cas qui n'arrive presque jamais (lier Google juste
      // après avoir édité son pseudo dans la même session).
      const username = await loadUserProfileUseCase(userProfileRepository, result.profile.uid);
      result.profile = { ...result.profile, username };
      // Republie la photo Google de CE compte dans son profil public —
      // fire-and-forget (jamais attendu), jamais sur le chemin critique de
      // l'affichage (voir la doc de `syncProfilePhotoToCloud`).
      void syncProfilePhotoToCloudUseCase(userProfileRepository, result.profile.uid, result.profile.photoUrl);
    }
    return result;
  },
);

export const signOutUser = createAsyncThunk('auth/signOut', () =>
  signOutUserUseCase(googleIdentityProvider, authRepository),
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(ensureSignedIn.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(ensureSignedIn.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'idle';
      })
      .addCase(ensureSignedIn.rejected, (state) => {
        state.status = 'error';
      })
      .addCase(loadUserProfile.fulfilled, (state, action) => {
        if (state.user) state.user.username = action.payload;
      })
      // Pas de cas `.rejected` : ne devrait arriver que si ce thunk est
      // dispatché avant `ensureSignedIn` (erreur de programmation, pas un
      // échec réseau — `loadUserProfileUseCase` lui-même ne rejette jamais,
      // voir sa doc). Un échec silencieux ici laisserait simplement `user`
      // sans `username`, l'écran retombant alors sur le même pseudonyme
      // généré que celui que ce usecase aurait lui-même renvoyé.
      .addCase(updateUsername.pending, (state, action) => {
        // Optimiste : affiche la saisie immédiatement, avant même que
        // l'écriture Firestore (best-effort) ne résolve — voir la doc du
        // thunk. `.fulfilled` applique ensuite la valeur normalisée exacte
        // (espaces superflus retirés, longueur bornée), qui peut différer
        // légèrement de la saisie brute.
        if (state.user) state.user.username = action.meta.arg;
      })
      .addCase(updateUsername.fulfilled, (state, action) => {
        if (state.user) state.user.username = action.payload;
      })
      .addCase(linkGoogleAccount.pending, (state) => {
        state.googleLinkStatus = 'loading';
        state.googleLinkError = null;
      })
      .addCase(linkGoogleAccount.fulfilled, (state, action) => {
        state.googleLinkStatus = 'idle';
        // `cancelled` : l'utilisateur a annulé le flux Google — on ne touche
        // pas à `user`, il reste anonyme. `linked`/`switched` portent tous
        // deux un `profile` à jour (même uid, ou celui du compte existant
        // retrouvé) ; les données restaurées pour `switched` sont déjà
        // appliquées aux autres slices par le thunk lui-même.
        if (action.payload.status !== 'cancelled') {
          state.user = action.payload.profile;
        }
      })
      .addCase(linkGoogleAccount.rejected, (state, action) => {
        state.googleLinkStatus = 'error';
        // Le cas "compte déjà utilisé" ne lève plus d'erreur depuis "Bascule
        // vers un compte existant" (voir AuthRepository.linkWithGoogle) : il
        // bascule automatiquement vers ce compte. Les erreurs restantes ici
        // sont donc génériques (réseau, config manquante...), jamais un
        // message technique.
        state.googleLinkError = 'La connexion avec Google a échoué. Réessaie plus tard.';
      })
      .addCase(signOutUser.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export default authSlice.reducer;
