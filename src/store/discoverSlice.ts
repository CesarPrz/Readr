import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { activityFeedRepository, bookRepository, bookStatsRepository } from '../composition/repositories';
import type { RecommendationGroup } from '../domain/entities/RecommendationGroup';
import { getRecommendations } from '../domain/usecases/getRecommendations';
import type { RootState } from './store';

type DiscoverState = {
  groups: RecommendationGroup[];
  status: 'idle' | 'loading' | 'error';
};

const initialState: DiscoverState = { groups: [], status: 'idle' };

export const fetchRecommendations = createAsyncThunk('discover/fetch', (_: void, { getState }) => {
  const state = getState() as RootState;
  // Les abonnements alimentent un groupe de plus ("coups de cœur de tes abonnements") — seulement si on en suit.
  const { followingIds } = state.social;
  const friends = followingIds.length > 0 ? { activityRepo: activityFeedRepository, followingIds } : undefined;
  return getRecommendations(bookRepository, bookStatsRepository, state.library.entries, friends);
});

const discoverSlice = createSlice({
  name: 'discover',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecommendations.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.groups = action.payload;
        state.status = 'idle';
      })
      .addCase(fetchRecommendations.rejected, (state) => {
        state.status = 'error';
      });
  },
});

export default discoverSlice.reducer;
