import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { authRepository, libraryRepository, librarySyncRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import type { LibraryEntry } from '../domain/entities/LibraryEntry';
import { DEFAULT_LIST_IDS } from '../domain/entities/ReadingList';
import { addBookToLibrary } from '../domain/usecases/addBookToLibrary';
import { loadLibrary } from '../domain/usecases/loadLibrary';
import { refreshLibraryFromServer } from '../domain/usecases/refreshLibraryFromServer';
import { removeBookFromLibrary } from '../domain/usecases/removeBookFromLibrary';
import { removeLibraryEntryFromCloud } from '../domain/usecases/removeLibraryEntryFromCloud';
import { syncLibraryEntry } from '../domain/usecases/syncLibraryEntry';
import { syncLibraryToCloud as syncLibraryToCloudUseCase } from '../domain/usecases/syncLibraryToCloud';
import { toggleBookList as toggleBookListUseCase } from '../domain/usecases/toggleBookList';
import { updateLibraryEntry, type LibraryEntryPatch } from '../domain/usecases/updateLibraryEntry';
import type { RootState } from './store';

type LibraryState = {
  entries: LibraryEntry[];
  status: 'loading' | 'idle';
  // Compteur incrémenté à chaque mutation LOCALE de `entries` (ajout,
  // suppression, patch, toggle liste, ou `setLibraryEntries`) — jamais par
  // `fetchLibrary`/`refreshLibrary` eux-mêmes. Sert de garde-fou anti-course
  // pour `refreshLibrary` (voir sa doc) : rien à voir avec une version de
  // schéma ou une migration, c'est un détail d'implémentation interne au
  // slice, jamais lu ni écrit ailleurs qu'ici et dans `refreshLibrary`.
  revision: number;
};

const initialState: LibraryState = { entries: [], status: 'loading', revision: 0 };

export const fetchLibrary = createAsyncThunk('library/fetch', () => loadLibrary(libraryRepository));

// Note sur les thunks ci-dessous (add/remove/patch/toggleBookList) : chacun
// appelle deux usecases — l'écriture locale (source de vérité) puis, en
// tâche de fond et sans l'attendre (`void`, jamais `await`), la sauvegarde
// cloud best-effort (Phase 2 du plan Firebase). Exception volontaire à la
// règle "un thunk n'appelle qu'un usecase" (CLAUDE.md) : la sauvegarde cloud
// n'est pas une action métier de plus, c'est un effet de bord silencieux sur
// une écriture locale déjà terminée — elle ne doit jamais retarder ni faire
// échouer le retour du thunk. `getCurrentUser()` (synchrone) plutôt que
// `state.auth`, pour ne pas dépendre de l'ordre d'enregistrement des slices.

export const addBook = createAsyncThunk(
  'library/add',
  async ({ book, listId }: { book: Book; listId?: string }, { getState }) => {
    const { entries } = (getState() as RootState).library;
    const next = await addBookToLibrary(libraryRepository, entries, book, listId ?? DEFAULT_LIST_IDS.toRead);
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
    // "note" et "rating" sont désormais toutes deux synchronisées (voir
    // data/firebase/mappers.ts, section "Listes de lecture publiques") —
    // plus besoin de distinguer les champs comme avant cette section.
    const updated = next.find((e) => e.id === id);
    if (updated) void syncLibraryEntry(librarySyncRepository, authRepository.getCurrentUser()?.uid, updated);
    return next;
  },
);

export const toggleBookList = createAsyncThunk(
  'library/toggleList',
  async ({ bookId, listId, add }: { bookId: string; listId: string; add: boolean }, { getState }) => {
    const state = getState() as RootState;
    const next = await toggleBookListUseCase(
      libraryRepository,
      state.library.entries,
      state.lists.lists,
      bookId,
      listId,
      add,
    );
    const updated = next.find((e) => e.id === bookId);
    if (updated) void syncLibraryEntry(librarySyncRepository, authRepository.getCurrentUser()?.uid, updated);
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

// Rafraîchissement depuis le serveur, qui fait foi (voir le plan Firebase,
// section "Le serveur fait foi") — déclenché au démarrage (App.tsx, après la
// sauvegarde en masse ci-dessus, voir sa doc pour l'ordre) et à l'ouverture
// de l'onglet Bibliothèque (LibraryScreen.tsx), jamais en continu. `null`
// (hors ligne/erreur, OU course avec une mutation locale détectée, voir
// `refreshLibraryFromServer`) laisse `entries` inchangé dans `extraReducers`
// plutôt que d'écraser l'affichage courant.
//
// `baselineRevision` : l'appelant lit `state.library.revision` lui-même,
// AVANT de lancer la sauvegarde en masse qui précède ce rafraîchissement
// (voir `App.tsx`/`LibraryScreen.tsx`), et le passe ici tel quel — ce thunk
// le transmet à `shouldApply` sans y toucher, qui le compare à la revision
// CourANTE au moment où `fetchAll` vient de répondre. Un écart entre les deux
// signifie qu'un ajout/like/etc. a eu lieu entre-temps (pendant le push ou
// pendant le fetch) : son résultat serait alors en retard par rapport à
// cette mutation, donc jeté plutôt qu'appliqué — voir la doc de
// `refreshLibraryFromServer`.
export const refreshLibrary = createAsyncThunk(
  'library/refreshFromServer',
  (baselineRevision: number, { getState }) => {
    const state = getState() as RootState;
    return refreshLibraryFromServer(librarySyncRepository, libraryRepository, state.auth.user?.uid, () => {
      const current = (getState() as RootState).library.revision;
      return current === baselineRevision;
    });
  },
);

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    // Utilisé par `listsSlice.deleteList` pour répercuter, dans ce slice, le
    // retrait d'une liste supprimée des `listIds` des livres concernés (voir
    // la doc de ce thunk) — pas une deuxième action métier, juste une
    // synchronisation d'état entre deux slices pour un seul geste utilisateur.
    setLibraryEntries(state, action: PayloadAction<LibraryEntry[]>) {
      state.entries = action.payload;
      state.revision += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLibrary.fulfilled, (state, action) => {
        state.entries = action.payload;
        state.status = 'idle';
      })
      .addCase(addBook.fulfilled, (state, action) => {
        state.entries = action.payload;
        state.revision += 1;
      })
      .addCase(removeBook.fulfilled, (state, action) => {
        state.entries = action.payload;
        state.revision += 1;
      })
      .addCase(patchLibraryEntry.fulfilled, (state, action) => {
        state.entries = action.payload;
        state.revision += 1;
      })
      .addCase(toggleBookList.fulfilled, (state, action) => {
        state.entries = action.payload;
        state.revision += 1;
      })
      .addCase(refreshLibrary.fulfilled, (state, action) => {
        // Pas de `state.revision += 1` ici volontairement : ce n'est pas une
        // mutation locale, c'est l'application d'un résultat serveur déjà
        // validé par `shouldApply` — voir la doc de `refreshLibrary` ci-dessus.
        if (action.payload) state.entries = action.payload;
      });
  },
});

export const { setLibraryEntries } = librarySlice.actions;
export default librarySlice.reducer;
