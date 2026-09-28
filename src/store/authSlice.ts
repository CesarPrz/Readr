import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authRepository, googleIdentityProvider } from '../composition/repositories';
import type { UserProfile } from '../domain/entities/UserProfile';
import { ensureSignedIn as ensureSignedInUseCase } from '../domain/usecases/ensureSignedIn';
import { linkGoogleAccount as linkGoogleAccountUseCase } from '../domain/usecases/linkGoogleAccount';
import { signOutUser as signOutUserUseCase } from '../domain/usecases/signOutUser';

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
// Profil (Phase 3) — jamais automatiquement. `null` en résultat = annulé par
// l'utilisateur (pas une erreur, voir `linkGoogleAccount` usecase).
export const linkGoogleAccount = createAsyncThunk('auth/linkGoogleAccount', () =>
  linkGoogleAccountUseCase(googleIdentityProvider, authRepository),
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
        // `action.payload` est `null` quand l'utilisateur a annulé le flux
        // Google — on ne touche alors pas à `user`, il reste anonyme.
        if (action.payload) state.user = action.payload;
      })
      .addCase(linkGoogleAccount.rejected, (state, action) => {
        state.googleLinkStatus = 'error';
        // `CredentialAlreadyInUseError` (voir AuthRepository) porte déjà un
        // message clair, présentable tel quel à l'utilisateur — les autres
        // erreurs (réseau, config manquante...) restent génériques pour ne
        // rien afficher de technique.
        state.googleLinkError =
          action.error.name === 'CredentialAlreadyInUseError'
            ? (action.error.message ?? null)
            : 'La connexion avec Google a échoué. Réessaie plus tard.';
      })
      .addCase(signOutUser.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export default authSlice.reducer;
