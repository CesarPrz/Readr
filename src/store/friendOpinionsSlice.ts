import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { bookOpinionsRepository, userProfileRepository } from '../composition/repositories';
import type { FriendOpinion } from '../domain/entities/FriendOpinion';
import { getFriendOpinions } from '../domain/usecases/getFriendOpinions';
import type { RootState } from './store';

type OpinionsEntry = { status: 'loading' | 'ready' | 'error'; items: FriendOpinion[] };

type FriendOpinionsState = {
  /** Par livre (`workKey` principal) : plusieurs fiches ouvertes à la suite gardent chacune leur résultat. */
  byBook: Record<string, OpinionsEntry>;
};

const initialState: FriendOpinionsState = { byBook: {} };

/**
 * Charge ce que les lecteurs suivis pensent d'un livre ("Les abonnements sur
 * la fiche livre", 08/10/2026) — voir `getFriendOpinions.ts`. Dispatché à
 * l'ouverture de `BookDetailScreen`. `workKey` identifie le livre dans le
 * store, `workKeys` sont toutes ses clés "œuvre" fusionnées, pour retrouver
 * l'entrée de chaque lecteur quelle que soit la clé sous laquelle il l'a ajouté.
 */
export const loadFriendOpinions = createAsyncThunk(
  'friendOpinions/load',
  ({ workKeys }: { workKey: string; workKeys: string[] }, { getState }) => {
    const { followingIds } = (getState() as RootState).social;
    return getFriendOpinions(bookOpinionsRepository, userProfileRepository, followingIds, workKeys);
  },
);

const friendOpinionsSlice = createSlice({
  name: 'friendOpinions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadFriendOpinions.pending, (state, action) => {
        const { workKey } = action.meta.arg;
        // Un rechargement garde les avis déjà affichés : pas de clignotement quand on revient sur la fiche.
        state.byBook[workKey] = { status: 'loading', items: state.byBook[workKey]?.items ?? [] };
      })
      .addCase(loadFriendOpinions.fulfilled, (state, action) => {
        state.byBook[action.meta.arg.workKey] = { status: 'ready', items: action.payload };
      })
      .addCase(loadFriendOpinions.rejected, (state, action) => {
        const { workKey } = action.meta.arg;
        state.byBook[workKey] = { status: 'error', items: state.byBook[workKey]?.items ?? [] };
      });
  },
});

export default friendOpinionsSlice.reducer;
