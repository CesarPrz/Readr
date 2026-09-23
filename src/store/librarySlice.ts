import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { libraryRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import type { LibraryEntry, ReadingStatus } from '../domain/entities/LibraryEntry';
import { addBookToLibrary } from '../domain/usecases/addBookToLibrary';
import { loadLibrary } from '../domain/usecases/loadLibrary';
import { removeBookFromLibrary } from '../domain/usecases/removeBookFromLibrary';
import { updateLibraryEntry, type LibraryEntryPatch } from '../domain/usecases/updateLibraryEntry';
import type { RootState } from './store';

type LibraryState = {
  entries: LibraryEntry[];
  status: 'loading' | 'idle';
};

const initialState: LibraryState = { entries: [], status: 'loading' };

export const fetchLibrary = createAsyncThunk('library/fetch', () => loadLibrary(libraryRepository));

export const addBook = createAsyncThunk(
  'library/add',
  ({ book, status }: { book: Book; status?: ReadingStatus }, { getState }) => {
    const { entries } = (getState() as RootState).library;
    return addBookToLibrary(libraryRepository, entries, book, status);
  },
);

export const removeBook = createAsyncThunk('library/remove', (id: string, { getState }) => {
  const { entries } = (getState() as RootState).library;
  return removeBookFromLibrary(libraryRepository, entries, id);
});

export const patchLibraryEntry = createAsyncThunk(
  'library/patch',
  ({ id, patch }: { id: string; patch: LibraryEntryPatch }, { getState }) => {
    const { entries } = (getState() as RootState).library;
    return updateLibraryEntry(libraryRepository, entries, id, patch);
  },
);

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLibrary.fulfilled, (state, action) => {
        state.entries = action.payload;
        state.status = 'idle';
      })
      .addCase(addBook.fulfilled, (state, action) => {
        state.entries = action.payload;
      })
      .addCase(removeBook.fulfilled, (state, action) => {
        state.entries = action.payload;
      })
      .addCase(patchLibraryEntry.fulfilled, (state, action) => {
        state.entries = action.payload;
      });
  },
});

export default librarySlice.reducer;
