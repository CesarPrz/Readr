import { configureStore } from '@reduxjs/toolkit';
import bookDetailReducer from './bookDetailSlice';
import libraryReducer from './librarySlice';
import searchReducer from './searchSlice';

export const store = configureStore({
  reducer: {
    library: libraryReducer,
    search: searchReducer,
    bookDetail: bookDetailReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
