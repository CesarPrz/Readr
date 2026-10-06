import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { activityFeedRepository, followRepository, userProfileRepository } from '../composition/repositories';
import type { FeedItem } from '../domain/entities/FeedItem';
import { getFriendFeed } from '../domain/usecases/getFriendFeed';
import type { RootState } from './store';

type FeedState = {
  items: FeedItem[];
  /** 'loading' seulement tant qu'aucun fil n'a encore été chargé : ensuite, un rechargement garde les lignes affichées. */
  status: 'idle' | 'loading' | 'refreshing' | 'error';
};

const initialState: FeedState = { items: [], status: 'idle' };

/** Charge le fil des lecteurs suivis ("Fil d'amis", 08/10/2026) — voir `getFriendFeed.ts`. Dispatché à chaque focus de l'onglet Fil. */
export const loadFeed = createAsyncThunk('feed/load', (_: void, { getState }) => {
  const uid = (getState() as RootState).auth.user?.uid;
  if (!uid) throw new Error('Fil demandé sans utilisateur courant.');
  return getFriendFeed(followRepository, userProfileRepository, activityFeedRepository, uid);
});

const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadFeed.pending, (state) => {
        state.status = state.items.length > 0 ? 'refreshing' : 'loading';
      })
      .addCase(loadFeed.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = 'idle';
      })
      .addCase(loadFeed.rejected, (state) => {
        // Un échec de RAFRAÎCHISSEMENT garde le fil déjà affiché ; seul un premier chargement raté affiche l'erreur.
        state.status = state.items.length > 0 ? 'idle' : 'error';
      });
  },
});

export default feedSlice.reducer;
