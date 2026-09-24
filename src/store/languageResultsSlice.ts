import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { bookRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import { searchBooksInLanguage } from '../domain/usecases/searchBooksInLanguage';

type LanguageResultsStatus = 'idle' | 'loading' | 'loadingMore' | 'error';

type LanguageResultsState = {
  query: string;
  language: string;
  results: Book[];
  page: number;
  numFound: number; // raw match count reported by the catalog, before grouping
  rawFetched: number; // raw docs fetched so far, before grouping — see searchSlice for why this (not results.length) drives pagination
  status: LanguageResultsStatus;
  latestRequestId?: string;
};

const initialState: LanguageResultsState = {
  query: '',
  language: '',
  results: [],
  page: 1,
  numFound: 0,
  rawFetched: 0,
  status: 'idle',
};

export const runLanguageSearch = createAsyncThunk(
  'languageResults/run',
  ({ query, language, page }: { query: string; language: string; page: number }) =>
    searchBooksInLanguage(bookRepository, query, language, page).then((result) => ({ ...result, page })),
);

const languageResultsSlice = createSlice({
  name: 'languageResults',
  initialState,
  reducers: {
    resetLanguageResults(state) {
      state.query = '';
      state.language = '';
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
      .addCase(runLanguageSearch.pending, (state, action) => {
        state.latestRequestId = action.meta.requestId;
        state.query = action.meta.arg.query;
        state.language = action.meta.arg.language;
        state.status = action.meta.arg.page === 1 ? 'loading' : 'loadingMore';
      })
      .addCase(runLanguageSearch.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return; // superseded by a newer search
        const { books, numFound, fetchedCount, page } = action.payload;
        state.results = page === 1 ? books : [...state.results, ...books];
        state.rawFetched = page === 1 ? fetchedCount : state.rawFetched + fetchedCount;
        state.numFound = numFound;
        state.page = page;
        state.status = 'idle';
      })
      .addCase(runLanguageSearch.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return;
        state.status = 'error';
      });
  },
});

export const { resetLanguageResults } = languageResultsSlice.actions;
export default languageResultsSlice.reducer;
