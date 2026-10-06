import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import bookDetailReducer from './bookDetailSlice';
import discoverReducer from './discoverSlice';
import feedReducer from './feedSlice';
import languageResultsReducer from './languageResultsSlice';
import libraryReducer from './librarySlice';
import listsReducer from './listsSlice';
import scanReducer from './scanSlice';
import searchReducer from './searchSlice';
import socialReducer from './socialSlice';
import usersReducer from './usersSlice';

export const store = configureStore({
  reducer: {
    library: libraryReducer,
    lists: listsReducer,
    search: searchReducer,
    languageResults: languageResultsReducer,
    bookDetail: bookDetailReducer,
    discover: discoverReducer,
    scan: scanReducer,
    auth: authReducer,
    users: usersReducer,
    social: socialReducer,
    feed: feedReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
