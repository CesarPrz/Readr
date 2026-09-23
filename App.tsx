import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { LibraryProvider } from './src/storage/LibraryContext';
import { navigationTheme } from './src/theme/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <LibraryProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </LibraryProvider>
    </SafeAreaProvider>
  );
}
