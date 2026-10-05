import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  authRepository,
  googleIdentityProvider,
  libraryRepository,
  librarySyncRepository,
  listRepository,
  listSyncRepository,
} from '../composition/repositories';
import type { UserProfile } from '../domain/entities/UserProfile';
import { ensureSignedIn as ensureSignedInUseCase } from '../domain/usecases/ensureSignedIn';
import {
  linkGoogleAccount as linkGoogleAccountUseCase,
  type LinkGoogleAccountResult,
} from '../domain/usecases/linkGoogleAccount';
import { signOutUser as signOutUserUseCase } from '../domain/usecases/signOutUser';
import { setLibraryEntries } from './librarySlice';
import { setLists } from './listsSlice';

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
