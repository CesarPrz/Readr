import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  followRepository,
  librarySyncRepository,
  listSyncRepository,
  userProfileRepository,
  userSearchRepository,
} from '../composition/repositories';
import type { LibraryEntry } from '../domain/entities/LibraryEntry';
import type { ReadingList } from '../domain/entities/ReadingList';
import type { PublicUserProfile } from '../domain/repositories/UserProfileRepository';
import type { UserSummary } from '../domain/repositories/UserSearchRepository';
import { getUserPublicProfile } from '../domain/usecases/getUserPublicProfile';
import { searchUsers as searchUsersUseCase } from '../domain/usecases/searchUsers';
import type { RootState } from './store';

type SearchStatus = 'idle' | 'loading' | 'error';

/** Profil public d'un AUTRE utilisateur, mis en cache par `uid` le temps de la session — jamais persisté, jamais mélangé à `library`/`lists` (qui sont SES données à lui). */
type PublicProfileState = {
  status: 'loading' | 'ready' | 'error';
  profile: PublicUserProfile | null;
  lists: ReadingList[];
  entries: LibraryEntry[];
  /** Abonnés/abonnements de CE lecteur (voir `FollowRepository`) — pour ses compteurs et le bouton "Suivre". */
  followerIds: string[];
  followingIds: string[];
};

type UsersState = {
  query: string;
  results: UserSummary[];
  searchStatus: SearchStatus;
  /** Message d'erreur brut de la dernière recherche échouée (ex. `permission-denied`) — affiché à l'écran pour diagnostiquer, jamais interprété. */
  searchError?: string;
  latestSearchRequestId?: string;
  profiles: Record<string, PublicProfileState>;
};

const initialState: UsersState = {
  query: '',
  results: [],
  searchStatus: 'idle',
  profiles: {},
};

/** "Recherche d'utilisateurs" (08/10/2026, plan Firebase) — voir `searchUsers.ts`. */
export const searchUsers = createAsyncThunk('users/search', (query: string, { getState }) => {
  const currentUid = (getState() as RootState).auth.user?.uid;
  return searchUsersUseCase(userSearchRepository, query, currentUid);
});

/** Charge (ou recharge) le profil public d'un autre utilisateur — voir `getUserPublicProfile.ts`. */
export const loadPublicProfile = createAsyncThunk('users/loadPublicProfile', (uid: string) =>
  getUserPublicProfile(userProfileRepository, listSyncRepository, librarySyncRepository, followRepository, uid),
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUserQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    clearUserResults(state) {
      state.results = [];
      state.searchStatus = 'idle';
      state.latestSearchRequestId = undefined; // toute réponse en vol devient obsolète
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchUsers.pending, (state, action) => {
        state.latestSearchRequestId = action.meta.requestId;
        state.searchStatus = 'loading';
        state.searchError = undefined;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestSearchRequestId) return; // remplacée par une recherche plus récente
        state.results = action.payload;
        state.searchStatus = 'idle';
      })
      .addCase(searchUsers.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestSearchRequestId) return;
        console.warn('[Readr] Recherche d\'utilisateurs échouée :', action.error);
        state.searchStatus = 'error';
        state.searchError = action.error.message;
      })
      .addCase(loadPublicProfile.pending, (state, action) => {
        const uid = action.meta.arg;
        const existing = state.profiles[uid];
        // Rouvrir un profil déjà vu affiche d'abord la version en cache, pas un écran vide.
        state.profiles[uid] = existing
          ? { ...existing, status: existing.status === 'ready' ? 'ready' : 'loading' }
          : { status: 'loading', profile: null, lists: [], entries: [], followerIds: [], followingIds: [] };
      })
      .addCase(loadPublicProfile.fulfilled, (state, action) => {
        state.profiles[action.meta.arg] = { status: 'ready', ...action.payload };
      })
      .addCase(loadPublicProfile.rejected, (state, action) => {
        const existing = state.profiles[action.meta.arg];
        state.profiles[action.meta.arg] =
          existing?.status === 'ready'
            ? existing
            : { status: 'error', profile: null, lists: [], entries: [], followerIds: [], followingIds: [] };
      });
  },
});

export const { setUserQuery, clearUserResults } = usersSlice.actions;
export default usersSlice.reducer;
