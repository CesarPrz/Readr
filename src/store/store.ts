import { configureStore } from '@reduxjs/toolkit';
import bookDetailReducer from './bookDetailSlice';
import discoverReducer from './discoverSlice';
import languageResultsReducer from './languageResultsSlice';
import libraryReducer from './librarySlice';
import scanReducer from './scanSlice';
import searchReducer from './searchSlice';

export const store = configureStore({
  reducer: {
    library: libraryReducer,
    search: searchReducer,
    languageResults: languageResultsReducer,
    bookDetail: bookDetailReducer,
    discover: discoverReducer,
    scan: scanReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
