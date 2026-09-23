# Readr

Appli mobile de recherche de livres (React Native + Expo), sans backend ni compte : recherche via l'API publique Open Library, fiche détail avec éditions/formats disponibles, et bibliothèque personnelle stockée localement sur l'appareil.

## Démarrer

Depuis ce dossier, en local (Node ≥ 18) :

```bash
npm install
npx expo install --fix   # aligne les versions natives sur le SDK Expo installé
npx expo install expo-camera   # ajoute le scanner de code-barres (une fois, à la bonne version)
npx expo start
```

Scanne le QR code avec l'app **Expo Go** (iOS/Android) pour lancer l'appli sans build natif.

> Les fichiers ont été générés hors ligne (pas d'accès au registre npm depuis l'environnement qui les a écrits), donc les versions de dépendances dans `package.json` sont volontairement larges. `npx expo install --fix` corrige automatiquement toute incohérence de version avant le premier lancement.

## Structure (Clean Architecture + Redux)

- `src/domain/` — cœur métier, aucune dépendance à React Native, Redux ou Open Library
  - `entities/` — `Book`, `Edition`, `BookDetail`, `LibraryEntry`
  - `repositories/` — interfaces `BookRepository` / `LibraryRepository` (ports)
  - `usecases/` — `searchBooks`, `findBookByIsbn`, `getBookDetail`, `loadLibrary`, `addBookToLibrary`, `removeBookFromLibrary`, `updateLibraryEntry`, `getRecommendations`
- `src/data/` — implémentations concrètes des ports du domain
  - `openLibrary/` — `OpenLibraryBookRepository` (appels HTTP + mapping vers les entités du domain)
  - `googleBooks/` — dernier repli de `findByIsbn` (pas de repository à part entière, juste un client + mapping utilisés en interne par `OpenLibraryBookRepository`)
  - `local/` — `AsyncStorageLibraryRepository` (bibliothèque locale persistée)
- `src/composition/repositories.ts` — seul fichier qui instancie les implémentations concrètes ; tout le reste dépend des interfaces du domain
- `src/store/` — state management Redux Toolkit : `librarySlice`, `searchSlice`, `bookDetailSlice`, `discoverSlice`, `scanSlice` (thunks qui appellent les usecases), `store.ts`, `hooks.ts` (`useAppDispatch`/`useAppSelector`)
- `src/theme/` — couleurs, espacements, typographie (thème sombre inspiré de la référence UI)
- `src/navigation/` — barre d'onglets (Recherche / Scanner / Découvrir / Ma bibliothèque) + piles de navigation
- `src/screens/` — Recherche, Scanner, Découvrir, Fiche livre, Ma bibliothèque (branchées sur le store Redux, plus d'appel direct à l'API ou à AsyncStorage)
- `src/components/` — carte livre, badge de format, étoiles de notation, sélecteur de statut (purement présentationnels)

Sens de dépendance : `screens/` et `store/` → `domain/` (interfaces) ; `data/` → implémente `domain/` ; `composition/` relie les deux. Aucun écran n'importe `data/` directement.

`src/api/` et `src/storage/` (l'ancienne implémentation Context + appels directs) sont obsolètes et vidés de leur contenu — à supprimer manuellement, rien ne les importe plus.

## Choix techniques (vs. le cahier des charges initial)

- **Redux Toolkit** pour le state partagé (bibliothèque, recherche, détail livre) organisé en **Clean Architecture** (domain / data / composition), à la demande explicite du porteur du projet — remplace le Context + AsyncStorage fait maison de la première version.
- **FlatList** plutôt que FlashList : moins de dépendances tierces à faire correspondre à la main sans pouvoir tester l'installation depuis l'environnement de génération initial. Fonctionnellement équivalent pour ce volume de données ; migrable plus tard si besoin de perf sur de très longues listes.
- Aucune donnée d'audiobook commercial (type Audible) n'existe en accès public : l'appli affiche un badge « disponible en édition audio » uniquement quand Open Library référence un format audio, sans lecteur ni lien d'achat.
- **Découvrir** recommande des livres par auteur : il prend les auteurs déjà présents dans la bibliothèque (les plus récemment ajoutés en premier), relance une recherche Open Library sur chacun, et exclut les livres déjà enregistrés. Recalculé à chaque ajout/retrait dans la bibliothèque. Pas de moteur de recommandation par genre/similarité pour l'instant, faute d'API publique adaptée.
- **Regroupement des doublons de recherche** : Open Library indexe souvent le même livre sous plusieurs fiches "work" distinctes (doublons de catalogage, traductions non reliées à l'œuvre d'origine), ce qui faisait apparaître un même livre plusieurs fois dans les résultats. `docsToBooks` (dans `data/openLibrary/mappers.ts`) regroupe les résultats d'une page par titre + premier auteur normalisés, fusionne leurs identifiants d'œuvre et leurs langues, et la fiche détail agrège ensuite éditions/langues de tous les identifiants fusionnés (`BookRepository.getDetail` prend un tableau d'identifiants). Heuristique, pas une garantie : le regroupement ne se fait qu'au sein d'une page de résultats, jamais entre plusieurs pages, et deux livres différents partageant exactement un titre et un premier auteur seraient (rarement) fusionnés à tort.
- **Scanner** utilise `expo-camera` (`CameraView`) pour lire les codes-barres EAN-13 (format Bookland — numériquement l'ISBN-13 des livres, aucune conversion nécessaire). Le code scanné passe par `BookRepository.findByIsbn`, qui relance d'abord une recherche Open Library filtrée par ISBN (`isbn:<code>`) et réutilise le pipeline de regroupement existant. Une fois le livre trouvé, deux boutons ajoutent directement à la bibliothèque en statut « à lire » ou « lu » ; un lien permet aussi d'ouvrir la fiche complète. `expo-camera` a un vrai config plugin (contrairement à `expo-status-bar`/`expo-image`) : il doit rester dans `app.json` → `plugins`, avec le message de permission caméra.
  - **Repli catalogue pour les ISBN absents de l'index de recherche** : l'index de recherche d'Open Library (`search.json`) n'indexe pas toutes les éditions de son propre catalogue — en pratique, beaucoup d'éditions de poche françaises sont invisibles à la recherche alors qu'elles existent bien chez Open Library. Quand `isbn:<code>` ne renvoie rien, `findByIsbn` bascule sur `/isbn/<code>.json`, qui résout directement par clé dans le catalogue brut et a une bien meilleure couverture. Ce repli est plus coûteux (plusieurs appels : édition → œuvre → auteur(s), les noms d'auteur n'étant jamais donnés directement) et moins riche (pas d'année de première publication, pas de fusion multi-éditions), mais suffisant pour identifier et ajouter le livre scanné.
  - **Repli Google Books en dernier recours** : certaines éditions n'existent tout simplement pas chez Open Library, ni dans l'index de recherche ni dans le catalogue brut — constaté en pratique sur *Dracula* chez J'ai lu (ISBN 978-2-290-05740-7), un cas pourtant loin d'être exotique. Open Library reste un catalogue orienté fonds de bibliothèques, avec une couverture inégale des éditions commerciales grand public. Quand les deux étapes Open Library échouent, `findByIsbn` interroge l'API Google Books (`data/googleBooks/googleBooksClient.ts`, pas une clé API requise pour une recherche par ISBN simple, mais quota anonyme limité). Le livre trouvé est ajoutable normalement, mais sans couverture (le format des URLs d'image Google Books est incompatible avec `covers.openlibrary.org`, sur lequel `BookRepository.coverUrl` est bâti) et sans fiche détail enrichie (pas d'identifiant "œuvre" Open Library à interroger pour les éditions/langues — la fiche affiche juste "aucune édition référencée"). Si même Google Books échoue, le livre est vraiment introuvable par code-barres.

> ⚠️ **`app.json` → `plugins`** ne doit lister que des paquets qui exportent réellement un config plugin (vérifiable via `node_modules/<paquet>/package.json` → `main`/`exports` pointant vers `app.plugin.js`). En lister un qui n'en a pas fait planter `expo start` (voir l'historique du projet) — `expo-camera` en a un, `expo-status-bar` et `expo-image` n'en ont pas.

## Prochaines étapes possibles

Voir la section Roadmap du cahier des charges (doc Claude) : mode sombre/clair, LibriVox pour les audiobooks du domaine public, partage vers d'autres applis, widget d'écran d'accueil.
