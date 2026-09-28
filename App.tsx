import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { store } from './src/store/store';
import { ensureSignedIn } from './src/store/authSlice';
import { fetchLibrary, syncLibraryToCloud } from './src/store/librarySlice';
import { navigationTheme } from './src/theme/theme';

export default function App() {
  useEffect(() => {
    const bootstrap = async () => {
      // Bibliothèque locale et connexion anonyme silencieuse (jamais d'écran,
      // voir le principe UX de connexion non intrusive — doc Claude du
      // projet, "firebase-social-plan") en parallèle, aucune des deux ne
      // dépend de l'autre.
      await Promise.all([store.dispatch(fetchLibrary()), store.dispatch(ensureSignedIn())]);
      // Sauvegarde cloud en masse (Phase 2) une fois les deux résolues — voir
      // la doc de `syncLibraryToCloud` (usecase) pour pourquoi ce passage
      // initial est nécessaire en plus de la sauvegarde au fil de l'eau.
      store.dispatch(syncLibraryToCloud());
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
