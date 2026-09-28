# Readr — directives pour Claude

Appli mobile de recherche de livres (React Native + Expo). Recherche via Open Library, fiche détail avec éditions/formats, bibliothèque personnelle en local. Voir le cahier des charges (doc Claude du projet) pour la vision produit et la roadmap ; ce fichier ne couvre que les règles techniques du code.

Depuis les Phases 1 et 2 du plan Firebase (doc Claude du projet, "firebase-social-plan"), l'app a une connexion Firebase anonyme et silencieuse en tâche de fond et sauvegarde la bibliothèque vers Firestore (voir sections dédiées plus bas) — mais aucun écran de compte n'existe encore, et le principe reste le même qu'avant pour l'utilisateur : rien à saisir, rien à voir.

## Architecture : Clean Architecture + Redux

Le code est organisé en couches, avec une règle de dépendance stricte : **le domain ne dépend de rien, tout le reste dépend du domain.**

```
domain/   (règles métier pures)
  ↑
data/     (implémente les interfaces du domain)
  ↑
composition/  (assemble domain + data)
  ↑
store/, screens/, components/  (consomment le domain via composition)
```

- `src/domain/` — cœur métier. Aucun import de React, React Native, Redux, Open Library ou AsyncStorage.
  - `entities/` — types métier purs : `Book`, `Edition` (dont `coverId?`, une édition peut avoir sa propre couverture ; `publisher?`, pas toujours renseigné), `BookDetail` (dont `subjects: string[]`, les sujets Open Library bruts — utilisés par `getRecommendations` pour la row de genre, pas affichés tels quels ailleurs), `LibraryEntry` (dont `liked?: boolean` — indépendant de `status: ReadingStatus`, voir `LibraryScreen` et sa 4ᵉ liste "Aimé"), `RecommendationGroup` (une row de "Découvrir" : `title` + `books`, voir `getRecommendations`), `UserProfile` (dont `isAnonymous: boolean` — identité Firebase Auth courante, voir section Firebase plus bas). `Book` et `LibraryEntry` portent deux champs de couverture : `coverId?: number` (schéma Open Library, résolu via `bookRepository.coverUrl(id, taille)`) et `coverUrl?: string` (URL déjà résolue, pour les sources sans identifiant Open Library, ex. `data/googleBooks/`). Partout où une couverture est affichée : `book.coverUrl ?? bookRepository.coverUrl(book.coverId, taille)`. Même logique pour `description?: string` : un résumé déjà connu pour les sources sans fiche "œuvre" Open Library à interroger — `BookDetailScreen` garde le résumé Open Library (`BookDetail.description`, une fois chargé) prioritaire, `Book.description`/`presetDescription` ne sert que de repli.
  - `repositories/` — interfaces (ports) : `BookRepository`, `LibraryRepository`, `AuthRepository` (session utilisateur — voir section Firebase plus bas ; volontairement minimal en Phase 1, `ensureSignedIn`/`getCurrentUser` seulement, `linkGoogleAccount`/`signOut` arriveront en Phase 3 comme nouvelles méthodes plutôt qu'un changement de celles-ci), `LibrarySyncRepository` (sauvegarde cloud à sens unique de la bibliothèque, Phase 2 — voir section Firebase plus bas ; ne définit aucune méthode de lecture, `LibraryRepository`/AsyncStorage reste la seule source de vérité). Elles décrivent un contrat, jamais une implémentation.
  - `usecases/` — une fonction par action métier (`searchBooks`, `searchBooksInLanguage`, `findBookByIsbn`, `addBookToLibrary`, `updateLibraryEntry`, `getRecommendations`, `ensureSignedIn`, `syncLibraryEntry`, `removeLibraryEntryFromCloud`, `syncLibraryToCloud`...). Prennent un repository en premier paramètre (injection par argument, pas de DI framework). `getRecommendations` renvoie plusieurs `RecommendationGroup[]` (pas un `Book[]` plat) : la logique de regroupement par auteur/raison et la recherche du genre vivent entièrement dans le usecase, `discoverSlice`/`DiscoverScreen` ne font qu'afficher les groupes reçus. `syncLibraryEntry`/`removeLibraryEntryFromCloud`/`syncLibraryToCloud` sont volontairement best-effort (erreurs avalées, voir section Firebase) — même esprit que `searchExcluding` dans `getRecommendations`.
- `src/data/` — implémentations concrètes des interfaces du domain.
  - `openLibrary/` — `OpenLibraryBookRepository` (appels HTTP, dont `findByIsbn` pour le scanner) + `mappers.ts` (JSON brut → entités du domain, avec le regroupement des doublons) + `types.ts` (formats bruts de l'API, jamais exposés hors de ce dossier).
  - `googleBooks/` — deux replis distincts vers l'API Google Books, appelés en interne par `OpenLibraryBookRepository`, tous deux silencieusement sautés sans clé API (`EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY`, voir section Environnements ci-dessous) : `findByIsbnOnGoogleBooks` (repli de `findByIsbn` par ISBN, quand Open Library index + catalogue ne trouvent rien, avant la BnF — seule source à fournir une vraie couverture, `Book.coverUrl`) et `findDescriptionOnGoogleBooks` (repli de `getDetail` par titre + auteur, quand la fiche "œuvre" Open Library existe mais n'a pas de `description`). Pas un `BookRepository` à part entière : `googleBooksClient.ts` + `mappers.ts` + `types.ts`, même séparation raw-types/mapping que les autres sources.
  - `bnf/` — tout dernier repli de `findByIsbn` (API SRU de la Bibliothèque nationale de France), appelé en interne par `OpenLibraryBookRepository` quand ni Open Library (index + catalogue) ni Google Books ne trouvent rien pour un ISBN. Pas un `BookRepository` à part entière (pas de `search`/`getDetail`) : juste `bnfClient.ts` + `xml.ts` (extraction du XML Dublin Core par regex, pas de JSON côté BnF) + `mappers.ts` + `types.ts`, même séparation raw-types/mapping que les autres sources. N'expose pas de couverture.
  - `local/` — `AsyncStorageLibraryRepository`.
  - `firebase/` — `FirebaseAuthRepository` (implémente `AuthRepository`) + `FirestoreLibraryRepository` (implémente `LibrarySyncRepository`, Phase 2) + `firebaseApp.ts` (init de l'app Firebase, de l'instance Auth et de l'instance Firestore) + `mappers.ts` (`firebase/auth`'s `User` → `UserProfile`, `LibraryEntry` → document Firestore), même séparation raw-types/mapping que les autres sources. Voir section Firebase dédiée plus bas pour le détail technique (persistance, connexion anonyme, sauvegarde cloud).
- `src/composition/repositories.ts` — **seul fichier autorisé à importer une classe concrète de `data/`**. Instancie `bookRepository`, `libraryRepository`, `authRepository` et `librarySyncRepository`, exportés typés en interfaces du domain.
- `src/store/` — Redux Toolkit. Un slice par domaine fonctionnel (`librarySlice`, `searchSlice`, `languageResultsSlice`, `bookDetailSlice`, `discoverSlice`, `scanSlice`, `authSlice`). Les thunks appellent des usecases avec les repositories importés depuis `composition/`, jamais depuis `data/` directement. `authSlice.ensureSignedIn` est dispatché une seule fois, silencieusement, au démarrage de l'app (`App.tsx`) — jamais en réaction à une action de l'utilisateur. `librarySlice.addBook`/`removeBook`/`patchLibraryEntry` déclenchent aussi, en tâche de fond sans l'attendre (`void`, jamais `await`), la sauvegarde cloud correspondante (Phase 2) — voir l'exception à la règle 7 ci-dessous. `librarySlice.syncLibraryToCloud` (sauvegarde en masse) est dispatché une seule fois au démarrage, depuis `App.tsx`, après `fetchLibrary` et `ensureSignedIn`.
- `src/screens/`, `src/components/`, `src/navigation/`, `src/theme/` — présentation. Consomment le store via `useAppDispatch`/`useAppSelector` (`src/store/hooks.ts`). Quatre onglets : Recherche, Scanner, Découvrir, Ma bibliothèque.
- `src/utils/` — helpers de présentation partagés entre écrans (ex. `languageLabels.ts`), sans dépendance à Redux/API. Différent de `domain/` : ce ne sont pas des règles métier, juste du formatage d'affichage réutilisé à plusieurs endroits.

## Règles à respecter

1. **Jamais d'import direct de `data/` depuis `screens/`, `components/` ou `store/`.** Tout passe par `composition/repositories.ts` ou par les types du `domain/`.
2. **Un écran ne fait jamais d'appel réseau ni d'accès AsyncStorage.** Il dispatch une action, un thunk appelle un usecase, le usecase appelle le repository.
3. **Les composants de `components/` restent purement présentationnels.** Ils reçoivent des props déjà résolues (ex. `coverUrl: string`, pas `coverId: number` + un appel à `bookRepository` dans le composant). C'est à l'écran (qui dépend déjà de `composition/`) de résoudre l'URL avant de la passer.
4. **Nouvelle fonctionnalité = un usecase avant un thunk.** Si une action métier n'a pas de fonction dans `domain/usecases/`, elle ne va pas directement dans un thunk Redux.
5. **Nouvelle source de données = un nouveau dossier dans `data/` (types + mapping + client), jamais un changement d'interface `domain/`** sauf si le besoin métier change réellement. Exemples réels : `data/googleBooks/` et `data/bnf/` sont des replis ciblés de `findByIsbn` (pas des `BookRepository` complets), utilisés en interne par `OpenLibraryBookRepository` — jamais un appel `fetch` planqué dans un composant ou un thunk.
6. **Les types bruts d'une API externe (`OpenLibraryDoc`, `RawEdition`...) ne sortent jamais de `data/<source>/types.ts`.** Le mapping vers les entités du domain se fait dans `data/<source>/mappers.ts`.
7. **Un thunk Redux ne fait que : appeler un usecase, retourner son résultat.** La logique (dédoublonnage, fusion, validation) vit dans le usecase, pas dans le thunk ni dans le reducer. **Exception documentée** : `librarySlice.addBook`/`removeBook`/`patchLibraryEntry` appellent aussi un second usecase de sauvegarde cloud best-effort (`syncLibraryEntry`/`removeLibraryEntryFromCloud`, Phase 2), jamais `await`é, dont le résultat n'alimente jamais la valeur retournée par le thunk — un effet de bord silencieux sur une écriture locale déjà terminée, pas une deuxième action métier du thunk.

## Conventions de code

- **UI et commentaires en français**, identifiants de code (variables, fonctions, types) en anglais — convention déjà en place dans tout le projet, à garder.
- Pas de `any` implicite ; types stricts partout, `interface` pour les ports (`BookRepository`, `LibraryRepository`), `type` pour les entités et le state.
- Un `ReadingStatus` (`to_read` / `reading` / `read`) est la seule énumération métier ; ne pas la dupliquer, l'importer depuis `domain/entities/LibraryEntry.ts`.
- Style existant : composants fonctionnels, hooks, `StyleSheet.create` en bas de fichier, pas de librairie de style externe.

## Stack

| Besoin | Choix |
| --- | --- |
| Framework | Expo (React Native) |
| Navigation | React Navigation (bottom tabs + native stack) |
| State management | Redux Toolkit (`@reduxjs/toolkit`, `react-redux`) |
| Appels API | `fetch` natif, encapsulé dans `data/openLibrary/` |
| Stockage local | `@react-native-async-storage/async-storage`, encapsulé dans `data/local/` |
| Liste de résultats | `FlatList` (voir note ci-dessous) |
| Images | `expo-image` |

**Écarts connus vs. un projet Expo standard**, à ne pas "corriger" sans en discuter : `FlatList` est utilisé à la place de `FlashList` (choix fait faute de pouvoir tester l'installation de paquets tiers pendant la génération initiale du code) — migration possible plus tard si la taille des listes le justifie.

## Config plugins (`app.json` → `plugins`)

**Règle apprise à la dure (a cassé le build deux fois) :** un paquet ne va dans `app.json` → `plugins` que s'il exporte réellement un config plugin Expo (un fichier `app.plugin.js`, vérifiable dans `node_modules/<paquet>/package.json`). En lister un qui n'en exporte pas fait planter `expo start` avec des erreurs type `PluginError: Cannot find module './NativeStatusBarWrapper'`, même si le paquet est un module Expo par ailleurs légitime.

- `expo-status-bar` et `expo-image` **n'ont pas** de config plugin : ne jamais les mettre dans `plugins`.
- `expo-camera` **a** un vrai config plugin : il doit y rester, avec son message de permission caméra (`cameraPermission`).
- Avant d'ajouter un nouveau paquet natif à `plugins`, vérifier son `package.json`/ses fichiers plutôt que de deviner par analogie avec un autre paquet Expo.

## Firebase (Phase 1 : fondation)

Première brique du plan Firebase (doc Claude du projet, "firebase-social-plan") : connexion anonyme silencieuse au démarrage, aucun écran, aucune fonctionnalité visible encore. À savoir pour toute future phase qui touche à `data/firebase/` :

- **SDK JS modulaire (`firebase`, pas `@react-native-firebase`)** — seul choix compatible Expo Go, voir le plan pour la justification complète. Version minimale `^12.0.0` : les versions antérieures cassent la résolution des modules ES sous Expo.
- **`initializeAuth` + `getReactNativePersistence(AsyncStorage)`** (dans `firebaseApp.ts`), pas `getAuth` seul — sans ça, une session (y compris anonyme) ne survit pas au redémarrage de l'app, elle reste en mémoire uniquement.
- **`FirebaseAuthRepository` attend le premier `onAuthStateChanged`** avant de décider de créer un utilisateur anonyme (`ensureSignedIn`). La restauration d'une session persistée est asynchrone : lire `firebaseAuth.currentUser` immédiatement au démarrage peut renvoyer `null` même s'il existe déjà un utilisateur anonyme d'un lancement précédent, ce qui créerait un nouvel utilisateur (et perdrait le premier) à chaque démarrage si on ne l'attendait pas.
- **`.env`** — six variables `EXPO_PUBLIC_FIREBASE_*` (voir `env.dev.example`/`env.prod.example`, section Environnements ci-dessous), à récupérer dans la Firebase Console (app Web) ; l'authentification anonyme doit aussi être activée manuellement côté console (Authentication → Sign-in method → Anonymous) avant que `ensureSignedIn` fonctionne. Ce ne sont pas des secrets à proprement parler (SDK web, sécurité assurée par les règles Firestore), mais suivent la même convention hors-dépôt que `EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY`.
- La liaison Google Sign-In et tout ce qui touche aux amis/au flux d'activité sont des phases ultérieures, pas encore implémentées — voir le plan pour la roadmap complète et les décisions encore ouvertes.

## Firebase (Phase 2 : sauvegarde cloud de la bibliothèque)

Deuxième brique du plan Firebase : chaque écriture sur la bibliothèque locale (ajout, changement de statut/note/aimé, suppression) est répliquée vers Firestore, en plus d'un passage de sauvegarde en masse au démarrage (`syncLibraryToCloud`, voir `App.tsx`) pour couvrir les entrées ajoutées avant l'existence de cette phase. Toujours en tâche de fond, jamais d'écran ni de blocage de l'UI :

- **À sens unique et best-effort.** `LibraryRepository`/AsyncStorage reste l'unique source de vérité — `LibrarySyncRepository` n'a aucune méthode de lecture, et `syncLibraryEntry`/`removeLibraryEntryFromCloud` avalent silencieusement toute erreur (voir leur doc). Rien dans l'app ne restaure/hydrate depuis Firestore à ce stade : un échec de sauvegarde (hors ligne, base Firestore ou règles pas encore configurées côté console) ne doit jamais faire échouer une action locale ni la ralentir perceptiblement — d'où les appels en `void`, jamais `await`é, dans `librarySlice`.
- **Champs synchronisés** : `title`, `authors`, `coverId`/`coverUrl`, `status`, `liked`, `rating`, `updatedAt` (`serverTimestamp()`). **Jamais `note`** (carnet personnel, reste strictement local) ni `description`/`languages`/`workKeys`/`addedAt` (non nécessaires pour l'instant — voir `toFirestoreLibraryEntry` dans `data/firebase/mappers.ts` si une phase future a besoin d'étendre ce document). `patchLibraryEntry` ne déclenche une sauvegarde cloud que si le patch touche `status`/`liked`/`rating` — un changement de `note` seul ne réécrit rien côté Firestore.
- **`?? null` systématique sur les champs optionnels** dans le mapper : Firestore refuse `undefined` comme valeur de champ (l'écriture échoue), contrairement à un objet JS ordinaire.
- **`initializeFirestore(app, { experimentalAutoDetectLongPolling: true })`** (dans `firebaseApp.ts`), pas `getFirestore` seul directement — le transport de streaming par défaut de Firestore (gRPC-Web/WebChannel) est peu fiable sur le fetch/XHR de React Native ; cette option bascule automatiquement sur du long-polling seulement quand c'est nécessaire. Même contrainte Fast Refresh que l'Auth : repli sur `getFirestore()` si `initializeFirestore()` a déjà été appelé sur cette app.
- **Configuration manuelle requise côté Firebase Console, dans CHACUN des deux projets (dev et prod)**, avant que la sauvegarde fonctionne réellement : créer une base Firestore (Firestore Database → Créer une base de données) et y coller les règles de `firestore.rules` (à la racine du dépôt — fichier de référence versionné, pas déployé automatiquement, pas de Firebase CLI dans ce projet). Sans ça, `upsertEntry`/`removeEntry` échouent silencieusement (best-effort, voir ci-dessus) — l'app reste pleinement utilisable, juste sans sauvegarde tant que ce n'est pas fait.
- Les règles actuelles (`firestore.rules`) n'autorisent chaque utilisateur qu'à lire/écrire sa propre bibliothèque — pas d'accès "amis" (Phase 4, pas encore implémentée). Ne pas élargir ces règles par anticipation.

## Environnements (dev / prod)

Deux projets Firebase distincts, jamais mélangés — le projet dev sert aux tests (utilisateurs anonymes jetables), le projet prod à l'usage réel de l'app :

- **`.env.dev` / `.env.prod`** — un fichier par environnement, jamais commité (voir `.gitignore`), contenant les vraies valeurs `EXPO_PUBLIC_FIREBASE_*` du projet Firebase correspondant (+ la clé Google Books, identique dans les deux). Templates : `env.dev.example` / `env.prod.example` à la racine — nommage sans le préfixe `.env` par contrainte de l'environnement de dev à distance (les outils de pont vers la machine de l'utilisateur refusent d'écrire tout fichier dont le nom commence par `.env`, sauf `.env.example` explicitement ; sans impact sur l'usage normal en local, l'utilisateur peut créer `.env.dev`/`.env.prod` normalement).
- **`.env`** — le seul fichier qu'Expo charge réellement (`npx expo start`). Jamais rempli à la main : c'est une copie de `.env.dev` ou `.env.prod`, régénérée par `scripts/use-env.js` via `npm run env:dev` / `npm run env:prod` (ou `npm run start:dev` / `npm run start:prod`, qui enchaînent bascule + `expo start -c`).
- **Pourquoi un script maison plutôt que `.env.development`/`.env.production` + `NODE_ENV`** (mécanisme intégré d'Expo) : ce mécanisme ne s'active que pour `expo export`/EAS Build (`NODE_ENV=production` forcé) — jamais pour `expo start`, seul mode utilisé par ce projet (Expo Go, pas de build). Le déclencher manuellement pour `expo start` est explicitement déconseillé par la doc Expo (effets de bord sur d'autres outils qui lisent `NODE_ENV`, ex. `npm install` qui sauterait les devDependencies). `scripts/use-env.js` (copie de fichier, cross-platform, aucune dépendance) est l'approche que la doc Expo recommande elle-même pour ce cas (`expo start` sans EAS).
- **`EXPO_PUBLIC_APP_ENV`** (`development`/`production`, dans chaque fichier `.env.*`) — juste un repère : loggé au démarrage par `firebaseApp.ts` (avec le `projectId` actif) pour vérifier d'un coup d'œil dans la console Metro/Expo Go qu'on n'est pas pointé sur le mauvais projet avant de tester quoi que ce soit qui écrit des données. N'est lu nulle part ailleurs dans le code — ce n'est pas un flag qui change le comportement de l'app, seulement un log.

## Dossiers obsolètes

`src/api/` et `src/storage/` sont l'ancienne implémentation (avant le passage à Clean Architecture + Redux). Leurs fichiers sont vidés et commentés ; rien ne les importe. Ils peuvent être supprimés du disque — Claude ne peut pas le faire à distance sur cet environnement, donc ça reste une suppression manuelle.

`src/data/googleBooks/` a été un temps désactivé (quota anonyme Google Books trop bas, remplacé par `src/data/bnf/`), puis réactivé avec une vraie clé API — il n'est **plus** obsolète, voir la section Architecture ci-dessus.

`src/components/FormatBadge.tsx` (et `accentForFormat` dans `theme.ts`) ne sont plus utilisés depuis que la fiche livre affiche les éditeurs (`Edition.publisher`) en texte simple plutôt que les formats en badges colorés (voir README, section Choix techniques). Laissés en place plutôt que supprimés, au cas où des badges de format seraient réintroduits ailleurs.

## Avant de proposer un changement de structure

Ce projet sert aussi de pièce de portfolio technique : la séparation en couches est volontaire et doit rester lisible même si l'app reste petite. Ne pas la simplifier "pour aller plus vite" sans en parler d'abord.
