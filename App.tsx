import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { store } from './src/store/store';
import { ensureSignedIn } from './src/store/authSlice';
import { fetchLibrary, refreshLibrary, syncLibraryToCloud } from './src/store/librarySlice';
import { fetchLists, refreshLists, syncListsToCloud } from './src/store/listsSlice';
import { navigationTheme } from './src/theme/theme';

export default function App() {
  useEffect(() => {
    const bootstrap = async () => {
      // Bibliothèque locale, listes de lecture (créées si besoin, voir
      // seedDefaultLists) et connexion anonyme silencieuse (jamais d'écran,
      // voir le principe UX de connexion non intrusive — doc Claude du
      // projet, "firebase-social-plan") en parallèle, aucune des trois ne
      // dépend des autres.
      await Promise.all([
        store.dispatch(fetchLibrary()),
        store.dispatch(fetchLists()),
        store.dispatch(ensureSignedIn()),
      ]);
      // Révision locale juste avant de lancer la sauvegarde en masse — voir
      // la doc de `refreshLibrary`/`refreshLists` (librarySlice/listsSlice) :
      // c'est ce repère qui permettra, une fois le cycle push+pull terminé,
      // de détecter qu'une mutation locale (ajout, like...) a eu lieu entre
      // ce point et l'arrivée du résultat du serveur, et donc de jeter ce
      // résultat plutôt que d'écraser cette mutation avec une version en
      // retard — bug réellement rencontré et corrigé le 29/09/2026.
      const libraryRevisionBeforePush = store.getState().library.revision;
      const listsRevisionBeforePush = store.getState().lists.revision;
      // Sauvegarde cloud en masse (Phase 2, puis listes) une fois les trois
      // résolues — voir la doc de `syncLibraryToCloud`/`syncListsToCloud`
      // (usecases) pour pourquoi ce passage initial est nécessaire en plus
      // de la sauvegarde au fil de l'eau. Attendue ici (contrairement à un
      // simple best-effort en tâche de fond) car le rafraîchissement qui suit
      // doit voir cette bibliothèque locale déjà remontée dans Firestore,
      // sans quoi le serveur répondrait avec une version en retard et
      // écraserait des changements locaux pas encore synchronisés — voir le
      // plan Firebase, section "Le serveur fait foi". Ces deux thunks ne
      // rejettent jamais (erreurs avalées par `syncLibraryEntry`/
      // `syncListEntry`), l'attente ne bloque donc jamais l'app hors ligne.
      await Promise.all([store.dispatch(syncLibraryToCloud()), store.dispatch(syncListsToCloud())]);
      // Puis le serveur fait foi (voir `refreshLibraryFromServer`/
      // `refreshListsFromServer`) : pas attendu, best-effort silencieux — si
      // Firestore ne répond pas, la copie locale déjà affichée reste telle
      // quelle. Le repère de révision capturé plus haut protège contre une
      // mutation locale survenue pendant ce cycle (voir sa doc).
      store.dispatch(refreshLibrary(libraryRevisionBeforePush));
      store.dispatch(refreshLists(listsRevisionBeforePush));
    };
    void bootstrap();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
