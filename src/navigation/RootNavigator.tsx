import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import SearchScreen from '../screens/SearchScreen';
import LanguageResultsScreen from '../screens/LanguageResultsScreen';
import ScanScreen from '../screens/ScanScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import LibraryScreen from '../screens/LibraryScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import { languageLabel } from '../utils/languageLabels';
import type {
  DiscoverStackParamList,
  LibraryStackParamList,
  RootTabParamList,
  ScanStackParamList,
  SearchStackParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const ScanStack = createNativeStackNavigator<ScanStackParamList>();
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.primaryText,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

function SearchStackNavigator() {
  return (
    <SearchStack.Navigator screenOptions={stackScreenOptions}>
      <SearchStack.Screen name="SearchHome" component={SearchScreen} options={{ title: 'Recherche' }} />
      <SearchStack.Screen
        name="LanguageResults"
        component={LanguageResultsScreen}
        options={({ route }) => ({ title: languageLabel(route.params.language) })}
      />
      <SearchStack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: '' }} />
    </SearchStack.Navigator>
  );
}

function ScanStackNavigator() {
  return (
    <ScanStack.Navigator screenOptions={stackScreenOptions}>
      <ScanStack.Screen name="ScanHome" component={ScanScreen} options={{ title: 'Scanner' }} />
      <ScanStack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: '' }} />
    </ScanStack.Navigator>
  );
}

function DiscoverStackNavigator() {
  return (
    <DiscoverStack.Navigator screenOptions={stackScreenOptions}>
      <DiscoverStack.Screen name="DiscoverHome" component={DiscoverScreen} options={{ title: 'Découvrir' }} />
      <DiscoverStack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: '' }} />
    </DiscoverStack.Navigator>
  );
}

function LibraryStackNavigator() {
  return (
    <LibraryStack.Navigator screenOptions={stackScreenOptions}>
      <LibraryStack.Screen name="LibraryHome" component={LibraryScreen} options={{ title: 'Ma bibliothèque' }} />
      <LibraryStack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: '' }} />
    </LibraryStack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accentOrange,
        tabBarInactiveTintColor: colors.secondaryText,
      }}
    >
      <Tab.Screen
        name="Recherche"
        component={SearchStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScanStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="barcode-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Découvrir"
        component={DiscoverStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Ma bibliothèque"
        component={LibraryStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="albums" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
