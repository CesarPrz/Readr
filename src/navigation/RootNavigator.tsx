import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import SearchScreen from '../screens/SearchScreen';
import LanguageResultsScreen from '../screens/LanguageResultsScreen';
import ScanScreen from '../screens/ScanScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import ListDetailScreen from '../screens/ListDetailScreen';
import ReadingYearScreen from '../screens/ReadingYearScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import UserListScreen from '../screens/UserListScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import { languageLabel } from '../utils/languageLabels';
import type {
  DiscoverStackParamList,
  HomeStackParamList,
  LibraryStackParamList,
  RootTabParamList,
  SearchStackParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
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
      {/* "Scanner dans Recherche et listes" (08/10/2026) : remplace l'ancien onglet Scanner. */}
      <SearchStack.Screen name="Scan" component={ScanScreen} options={{ title: 'Scanner un livre' }} />
      {/* "Recherche d'utilisateurs" (08/10/2026) : profil public d'un autre utilisateur, puis ses listes en lecture seule. */}
      <SearchStack.Screen name="UserProfile" component={UserProfileScreen} options={({ route }) => ({ title: route.params.username })} />
      <SearchStack.Screen name="UserList" component={UserListScreen} options={({ route }) => ({ title: route.params.listName })} />
    </SearchStack.Navigator>
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

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      {/* Accueil (08/10/2026, remplace l'ancien onglet Fil) : barre de recherche, fil des abonnements, recommandations ; puis le livre ou le profil d'un lecteur ouvert depuis une ligne. */}
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Accueil', headerShown: false }} />
      <HomeStack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: '' }} />
      <HomeStack.Screen name="UserProfile" component={UserProfileScreen} options={({ route }) => ({ title: route.params.username })} />
      <HomeStack.Screen name="UserList" component={UserListScreen} options={({ route }) => ({ title: route.params.listName })} />
    </HomeStack.Navigator>
  );
}

function LibraryStackNavigator() {
  return (
    <LibraryStack.Navigator screenOptions={stackScreenOptions}>
      {/*
        Depuis "Profil fusionné" (07/10/2026, plan Firebase), cet écran
        affiche aussi le profil (avatar, pseudo, connexion Google) en
        en-tête — voir `ProfileHeader.tsx` et `LibraryScreen.tsx`. L'ancien
        onglet Profil dédié a disparu, remplacé par rien de plus que ça.
      */}
      <LibraryStack.Screen name="LibraryHome" component={LibraryScreen} options={{ title: 'Ma bibliothèque' }} />
      <LibraryStack.Screen
        name="ListDetail"
        component={ListDetailScreen}
        // Titre de repli avant que `ListDetailScreen` n'affine l'en-tête via
        // `navigation.setOptions` (nom de la liste + bouton de suppression
        // pour une liste perso) — évite un flash de titre vide à l'ouverture.
        options={({ route }) => ({ title: route.params.listName })}
      />
      <LibraryStack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: '' }} />
      <LibraryStack.Screen name="Scan" component={ScanScreen} options={{ title: 'Scanner un livre' }} />
      {/* "Mon année de lecture" (06/10/2026) : ouvert depuis la carte au-dessus des listes. */}
      <LibraryStack.Screen name="ReadingYear" component={ReadingYearScreen} options={{ title: 'Mon année de lecture' }} />
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
        name="Accueil"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Recherche"
        component={SearchStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} />,
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
