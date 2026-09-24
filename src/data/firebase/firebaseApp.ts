import { getApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Config Firebase : jamais codée en dur, voir .env.example pour où récupérer
// ces valeurs (Firebase Console → Paramètres du projet → Vos applications →
// application Web). Ce ne sont pas des secrets au sens strict — le SDK web
// Firebase est conçu pour être visible côté client, la sécurité vient des
// règles Firestore — mais on suit la même convention que
// EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY pour ne pas les coder en dur dans le dépôt.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// getApps()/getApp() : évite une double initialisation si ce module est
// réévalué plusieurs fois (Fast Refresh en dev) — initializeApp() jette une
// erreur si on l'appelle deux fois avec le même nom d'app par défaut.
const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Repère utile : confirme quel projet Firebase est réellement actif (dev ou
// prod — voir README, section "Environnements"), directement dans la console
// Metro/Expo Go. Utile en particulier pour vérifier qu'on n'est pas
// accidentellement pointé sur le mauvais projet avant de tester quoi que ce
// soit qui écrit des données.
console.log(
  `[Readr] Environnement Firebase actif : ${process.env.EXPO_PUBLIC_APP_ENV ?? 'non défini'} (projet "${firebaseConfig.projectId ?? 'inconnu'}")`,
);

// initializeAuth (et non getAuth) est nécessaire pour brancher la persistance
// AsyncStorage : sans ça, une session Auth (y compris anonyme) ne survit pas
// au redémarrage de l'app sur React Native, elle ne persiste qu'en mémoire.
// Même contrainte Fast Refresh que ci-dessus : initializeAuth() jette si on
// l'appelle deux fois sur la même app, d'où le repli sur getAuth().
let firebaseAuth: Auth;
try {
  firebaseAuth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  firebaseAuth = getAuth(firebaseApp);
}

export { firebaseAuth };
