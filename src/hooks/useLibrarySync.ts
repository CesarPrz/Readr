import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { refreshLibrary, syncLibraryToCloud } from '../store/librarySlice';
import { refreshLists, syncListsToCloud } from '../store/listsSlice';
import { useAppDispatch } from '../store/hooks';
import { store } from '../store/store';

/**
 * Le serveur fait foi (voir le plan Firebase, doc Claude du projet, section
 * "Le serveur fait foi") : à chaque fois qu'un écran appelant ce hook
 * reprend le focus, on pousse les mutations locales en attente puis on
 * relit Firestore — jamais un pull seul (bug corrigé, voir CLAUDE.md "Le
 * serveur fait foi" pour l'historique complet des deux bugs qui ont mené à
 * ce mécanisme).
 *
 * Extrait de `LibraryScreen` (qui l'utilisait seul à l'origine) pour être
 * partagé avec `ListDetailScreen` : les deux écrans peuvent reprendre le
 * focus juste après un ajout/like fait depuis `BookDetailScreen`
 * (navigation `Bibliothèque → une liste → fiche livre → retour`), donc les
 * deux doivent refaire ce cycle push-puis-pull — sinon le livre tout juste
 * ajouté peut sembler disparaître dans celui des deux écrans qui n'aurait
 * pas ce comportement, exactement le bug déjà corrigé une fois pour
 * `LibraryScreen` avant que `ListDetailScreen` n'existe.
 *
 * **Garde-fou anti-course par compteur de révision** (deuxième bug corrigé,
 * voir CLAUDE.md) : le repère de révision est lu via `store.getState()`
 * importé directement, pas via `useAppSelector`, car la fermeture passée à
 * `useFocusEffect` a des dépendances volontairement stables (`[dispatch]`,
 * pour ne se déclencher qu'au focus) — un hook réactif y capturerait une
 * valeur figée au premier rendu, jamais rafraîchie.
 */
export function useLibrarySync() {
  const dispatch = useAppDispatch();

  useFocusEffect(
    useCallback(() => {
      const refreshFromServer = async () => {
        const baselineLibraryRevision = store.getState().library.revision;
        const baselineListsRevision = store.getState().lists.revision;
        await Promise.all([dispatch(syncLibraryToCloud()), dispatch(syncListsToCloud())]);
        await Promise.all([dispatch(refreshLibrary(baselineLibraryRevision)), dispatch(refreshLists(baselineListsRevision))]);
      };
      void refreshFromServer();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]),
  );
}
