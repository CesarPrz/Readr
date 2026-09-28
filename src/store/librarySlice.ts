import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authRepository, libraryRepository, librarySyncRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import type { LibraryEntry, ReadingStatus } from '../domain/entities/LibraryEntry';
import { addBookToLibrary } from '../domain/usecases/addBookToLibrary';
import { loadLibrary } from '../domain/usecases/loadLibrary';
import { removeBookFromLibrary } from '../domain/usecases/removeBookFromLibrary';
import { removeLibraryEntryFromCloud } from '../domain/usecases/removeLibraryEntryFromCloud';
import { syncLibraryEntry } from '../domain/usecases/syncLibraryEntry';
import { syncLibraryToCloud as syncLibraryToCloudUseCase } from '../domain/usecases/syncLibraryToCloud';
import { updateLibraryEntry, type LibraryEntryPatch } from '../domain/usecases/updateLibraryEntry';
import type { RootState } from './store';

type LibraryState = {
  entries: LibraryEntry[];
  status: 'loading' | 'idle';
};

const initialState: LibraryState = { entries: [], status: 'loading' };

export const fetchLibrary = createAsyncThunk('library/fetch', () => loadLibrary(libraryRepository));

// Note sur les thunks ci-dessous (add/remove/patch) : chacun appelle deux
// usecases — l'écriture locale (source de vérité) puis, en tâche de fond et
// sans l'attendre (`void`, jamais `await`), la sauvegarde cloud best-effort
// (Phase 2 du plan Firebase). Exception volontaire à la règle "un thunk
// n'appelle qu'un usecase" (CLAUDE.md) : la sauvegarde cloud n'est pas une
// action métier de plus, c'est un effet de bord silencieux sur une écriture
// locale déjà terminée — elle ne doit jamais retarder ni faire échouer le
// retour du thunk. `getCurrentUser()` (synchrone) plutôt que `state.auth`,
// pour ne pas dépendre de l'ordre d'enregistrement des slices.

export const addBook = createAsyncThunk(
  'library/add',
  async ({ book, status, liked }: { book: Book; status?: ReadingStatus; liked?: boolean }, { getState }) => {
    const { entries } = (getState() as RootState).library;
    const next = await addBookToLibrary(libraryRepository, entries, book, status, liked);
    if (next !== entries) {
      const added = next.find((e) => e.id === book.id);
      if (added) void syncLibraryEntry(librarySyncRepository, authRepository.getCurrentUser()?.uid, added);
    }
    return next;
  },
);

export const removeBook = createAsyncThunk('library/remove', async (id: string, { getState }) => {
  const { entries } = (getState() as RootState).library;
  const next = await removeBookFromLibrary(libraryRepository, entries, id);
  void removeLibraryEntryFromCloud(librarySyncRepository, authRepository.getCurrentUser()?.uid, id);
  return next;
});

export const patchLibraryEntry = createAsyncThunk(
  'library/patch',
  async ({ id, patch }: { id: string; patch: LibraryEntryPatch }, { getState }) => {
    const { entries } = (getState() as RootState).library;
    const next = await updateLibraryEntry(libraryRepository, entries, id, patch);
    // "note" reste locale (voir LibrarySyncRepository) : inutile de déclencher
    // une écriture cloud si c'est le seul champ modifié par ce patch.
    const touchesSyncedField = 'status' in patch || 'liked' in patch || 'rating' in patch;
    if (touchesSyncedField) {
      const updated = next.find((e) => e.id === id);
      if (updated) void syncLibraryEntry(librarySyncRepository, authRepository.getCurrentUser()?.uid, updated);
    }
    return next;
  },
);

// Sauvegarde en masse au démarrage (voir App.tsx et la doc du usecase) — pour
// que les entrées ajoutées avant l'existence de la Phase 2 finissent aussi
// par être sauvegardées, pas seulement les futures modifications. Ne modifie
// pas `entries` : pas besoin de cas dans `extraReducers`.
export const syncLibraryToCloud = createAsyncThunk('library/syncToCloud', (_: void, { getState }) => {
  const state = getState() as RootState;
  return syncLibraryToCloudUseCase(librarySyncRepository, state.auth.user?.uid, state.library.entries);
});

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
