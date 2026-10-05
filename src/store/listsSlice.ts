import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { authRepository, libraryRepository, listRepository, listSyncRepository } from '../composition/repositories';
import type { ReadingList } from '../domain/entities/ReadingList';
import { createReadingList } from '../domain/usecases/createReadingList';
import { deleteReadingList } from '../domain/usecases/deleteReadingList';
import { refreshListsFromServer } from '../domain/usecases/refreshListsFromServer';
import { removeListFromCloud } from '../domain/usecases/removeListFromCloud';
import { renameReadingList } from '../domain/usecases/renameReadingList';
import { seedDefaultLists } from '../domain/usecases/seedDefaultLists';
import { syncListEntry } from '../domain/usecases/syncListEntry';
import { syncListsToCloud as syncListsToCloudUseCase } from '../domain/usecases/syncListsToCloud';
import { setLibraryEntries } from './librarySlice';
import type { RootState } from './store';

type ListsState = {
  lists: ReadingList[];
  status: 'loading' | 'idle';
  // Pendant de `LibraryState.revision` (librarySlice) — voir sa doc pour le
  // rôle de garde-fou anti-course de `refreshLists`.
  revision: number;
};

const initialState: ListsState = { lists: [], status: 'loading', revision: 0 };

// Même esprit que les thunks de librarySlice (voir CLAUDE.md, règle 7 et son
// exception documentée) : chaque thunk n'appelle qu'un seul usecase métier ;
// la sauvegarde cloud qui suit est un effet de bord best-effort, jamais
// attendu (`void`), jamais déterminant pour la valeur retournée.

// "Créées à la création du compte" au sens produit : voir la doc de
// `seedDefaultLists` pour pourquoi c'est implémenté comme "s'il n'y en a
// encore aucune localement" plutôt que sur un vrai événement Firebase de
// création de compte.
export const fetchLists = createAsyncThunk('lists/fetch', () => seedDefaultLists(listRepository));

export const createList = createAsyncThunk('lists/create', async (name: string, { getState }) => {
  const { lists } = (getState() as RootState).lists;
  const next = await createReadingList(listRepository, lists, name);
  if (next !== lists) {
    const created = next[next.length - 1];
    void syncListEntry(listSyncRepository, authRepository.getCurrentUser()?.uid, created);
  }
  return next;
});

export const renameList = createAsyncThunk(
  'lists/rename',
  async ({ id, name }: { id: string; name: string }, { getState }) => {
    const { lists } = (getState() as RootState).lists;
    const next = await renameReadingList(listRepository, lists, id, name);
    const renamed = next.find((l) => l.id === id);
    if (renamed) void syncListEntry(listSyncRepository, authRepository.getCurrentUser()?.uid, renamed);
    return next;
  },
);

export const deleteList = createAsyncThunk('lists/delete', async (id: string, { getState, dispatch }) => {
  const state = getState() as RootState;
  const { lists, entries } = await deleteReadingList(
    listRepository,
    libraryRepository,
    state.lists.lists,
    state.library.entries,
    id,
  );
  void removeListFromCloud(listSyncRepository, authRepository.getCurrentUser()?.uid, id);
  // `deleteReadingList` (un seul usecase, voir sa doc) touche aussi les
  // livres qui référençaient cette liste — on répercute ce second résultat
  // dans le slice `library` via une action simple (pas un second usecase,
  // juste une synchronisation d'état entre deux slices pour un seul geste
  // utilisateur).
  dispatch(setLibraryEntries(entries));
  return lists;
});

// Sauvegarde en masse au démarrage — même besoin/doc que syncLibraryToCloud.
export const syncListsToCloud = createAsyncThunk('lists/syncToCloud', (_: void, { getState }) => {
  const state = getState() as RootState;
  return syncListsToCloudUseCase(listSyncRepository, state.auth.user?.uid, state.lists.lists);
});

// Rafraîchissement depuis le serveur — pendant de `refreshLibrary`
// (librarySlice), même déclencheurs (démarrage + ouverture de l'onglet
// Bibliothèque), même garde-fou anti-course via `baselineRevision`/
// `shouldApply`, voir sa doc pour le détail complet.
export const refreshLists = createAsyncThunk(
  'lists/refreshFromServer',
  (baselineRevision: number, { getState }) => {
    const state = getState() as RootState;
    return refreshListsFromServer(listSyncRepository, listRepository, state.auth.user?.uid, () => {
      const current = (getState() as RootState).lists.revision;
      return current === baselineRevision;
    });
  },
);

const listsSlice = createSlice({
  name: 'lists',
  initialState,
  reducers: {
    // Utilisé par `authSlice.linkGoogleAccount` quand la liaison bascule vers
    // un compte existant (voir la doc du usecase `linkGoogleAccount`) pour
    // appliquer les listes restaurées depuis Firestore — pas une deuxième
    // action métier, synchronisation d'état entre deux slices pour un seul
    // geste utilisateur, même pattern que `setLibraryEntries` (librarySlice).
    setLists(state, action: PayloadAction<ReadingList[]>) {
      state.lists = action.payload;
      state.revision += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLists.fulfilled, (state, action) => {
        state.lists = action.payload;
        state.status = 'idle';
      })
      .addCase(createList.fulfilled, (state, action) => {
        state.lists = action.payload;
        state.revision += 1;
      })
      .addCase(renameList.fulfilled, (state, action) => {
        state.lists = action.payload;
        state.revision += 1;
      })
      .addCase(deleteList.fulfilled, (state, action) => {
        state.lists = action.payload;
        state.revision += 1;
      })
      .addCase(refreshLists.fulfilled, (state, action) => {
        // Pas de bump de revision ici, même raisonnement que refreshLibrary.
        if (action.payload) state.lists = action.payload;
      });
  },
});

export const { setLists } = listsSlice.actions;
export default listsSlice.reducer;
