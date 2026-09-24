import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { store } from './src/store/store';
import { ensureSignedIn } from './src/store/authSlice';
import { fetchLibrary } from './src/store/librarySlice';
import { navigationTheme } from './src/theme/theme';

export default function App() {
  useEffect(() => {
    store.dispatch(fetchLibrary());
    // Connexion anonyme silencieuse — jamais d'écran, voir le principe UX de
    // connexion non intrusive (doc Claude du projet, "firebase-social-plan").
    store.dispatch(ensureSignedIn());
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
