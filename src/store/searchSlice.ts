import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { bookRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import { searchBooks } from '../domain/usecases/searchBooks';

type SearchStatus = 'idle' | 'loading' | 'loadingMore' | 'error';

type SearchState = {
  query: string;
  results: Book[];
  page: number;
  numFound: number; // raw match count reported by the catalog, before grouping
  rawFetched: number; // raw docs fetched so far, before grouping — grouping can shrink `results` well below `numFound`
  status: SearchStatus;
  latestRequestId?: string;
};

const initialState: SearchState = {
  query: '',
  results: [],
  page: 1,
  numFound: 0,
  rawFetched: 0,
  status: 'idle',
};

export const runSearch = createAsyncThunk('search/run', ({ query, page }: { query: string; page: number }) =>
  searchBooks(bookRepository, query, page).then((result) => ({ ...result, page })),
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    clearResults(state) {
      state.results = [];
      state.numFound = 0;
      state.rawFetched = 0;
      state.page = 1;
      state.status = 'idle';
      state.latestRequestId = undefined; // any in-flight response becomes stale
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runSearch.pending, (state, action) => {
        state.latestRequestId = action.meta.requestId;
        state.status = action.meta.arg.page === 1 ? 'loading' : 'loadingMore';
      })
      .addCase(runSearch.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return; // superseded by a newer search
        const { books, numFound, fetchedCount, page } = action.payload;
        state.results = page === 1 ? books : [...state.results, ...books];
        state.rawFetched = page === 1 ? fetchedCount : state.rawFetched + fetchedCount;
        state.numFound = numFound;
        state.page = page;
        state.status = 'idle';
      })
      .addCase(runSearch.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return;
        state.status = 'error';
      });
  },
});

export const { setQuery, clearResults } = searchSlice.actions;
export default searchSlice.reducer;
