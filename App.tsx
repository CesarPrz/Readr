import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { store } from './src/store/store';
import { fetchLibrary } from './src/store/librarySlice';
import { navigationTheme } from './src/theme/theme';

export default function App() {
  useEffect(() => {
    store.dispatch(fetchLibrary());
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
