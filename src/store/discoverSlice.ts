import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { bookRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import { getRecommendations } from '../domain/usecases/getRecommendations';
import type { RootState } from './store';

type DiscoverState = {
  recommendations: Book[];
  status: 'idle' | 'loading' | 'error';
};

const initialState: DiscoverState = { recommendations: [], status: 'idle' };

export const fetchRecommendations = createAsyncThunk('discover/fetch', (_: void, { getState }) => {
  const { entries } = (getState() as RootState).library;
  return getRecommendations(bookRepository, entries);
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
        state.recommendations = action.payload;
        state.status = 'idle';
      })
      .addCase(fetchRecommendations.rejected, (state) => {
        state.status = 'error';
      });
  },
});

export default discoverSlice.reducer;
