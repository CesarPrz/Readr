import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { followRepository } from '../composition/repositories';
import { followUser as followUserUseCase } from '../domain/usecases/followUser';
import { loadFollowGraph as loadFollowGraphUseCase } from '../domain/usecases/loadFollowGraph';
import { unfollowUser as unfollowUserUseCase } from '../domain/usecases/unfollowUser';
import type { RootState } from './store';

type SocialState = {
  /** Ids des lecteurs que JE suis — alimente le compteur Abonnements, le bouton "Suivre" et le fil. */
  followingIds: string[];
  /** Ids des lecteurs qui ME suivent — alimente le compteur Abonnés. */
  followerIds: string[];
  /** Lecteurs dont un (dé)suivi est en cours : désactive leur bouton le temps de l'écriture, évite un double tap. */
  pendingUids: string[];
};

const initialState: SocialState = { followingIds: [], followerIds: [], pendingUids: [] };

function currentUid(getState: () => unknown): string {
  const uid = (getState() as RootState).auth.user?.uid;
  if (!uid) throw new Error('Action sociale appelée sans utilisateur courant — ne devrait jamais arriver.');
  return uid;
}

/**
 * Charge mon graphe d'abonnements ("Fil d'amis", 08/10/2026, plan Firebase) —
 * dispatché au démarrage (`App.tsx`, après `ensureSignedIn`, jamais attendu)
 * et à chaque focus de `LibraryScreen` pour garder les compteurs à jour. Un
 * échec (hors ligne) laisse l'état précédent tel quel, sans alerte.
 */
export const loadFollowGraph = createAsyncThunk('social/loadFollowGraph', (_: void, { getState }) =>
  loadFollowGraphUseCase(followRepository, currentUid(getState)),
);

/** Suit `targetUid`. Mise à jour OPTIMISTE dès `.pending` (le bouton bascule tout de suite), annulée si l'écriture échoue — voir `extraReducers`. */
export const followUser = createAsyncThunk('social/follow', (targetUid: string, { getState }) =>
  followUserUseCase(followRepository, currentUid(getState), targetUid),
);

/** Cesse de suivre `targetUid` — même optimisme que `followUser`. */
export const unfollowUser = createAsyncThunk('social/unfollow', (targetUid: string, { getState }) =>
  unfollowUserUseCase(followRepository, currentUid(getState), targetUid),
);

const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadFollowGraph.fulfilled, (state, action) => {
        state.followingIds = action.payload.followingIds;
        state.followerIds = action.payload.followerIds;
      })
      .addCase(followUser.pending, (state, action) => {
        const target = action.meta.arg;
        if (!state.followingIds.includes(target)) state.followingIds.push(target);
        state.pendingUids.push(target);
      })
      .addCase(followUser.fulfilled, (state, action) => {
        state.pendingUids = state.pendingUids.filter((id) => id !== action.meta.arg);
      })
      .addCase(followUser.rejected, (state, action) => {
        state.followingIds = state.followingIds.filter((id) => id !== action.meta.arg); // annule l'optimisme
        state.pendingUids = state.pendingUids.filter((id) => id !== action.meta.arg);
      })
      .addCase(unfollowUser.pending, (state, action) => {
        const target = action.meta.arg;
        state.followingIds = state.followingIds.filter((id) => id !== target);
        state.pendingUids.push(target);
      })
      .addCase(unfollowUser.fulfilled, (state, action) => {
        state.pendingUids = state.pendingUids.filter((id) => id !== action.meta.arg);
      })
      .addCase(unfollowUser.rejected, (state, action) => {
        const target = action.meta.arg;
        if (!state.followingIds.includes(target)) state.followingIds.push(target); // annule l'optimisme
        state.pendingUids = state.pendingUids.filter((id) => id !== target);
      });
  },
});

export default socialSlice.reducer;
