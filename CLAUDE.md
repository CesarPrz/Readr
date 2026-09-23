# Readr — directives pour Claude

Appli mobile de recherche de livres (React Native + Expo), sans backend ni compte. Recherche via Open Library, fiche détail avec éditions/formats, bibliothèque personnelle en local. Voir le cahier des charges (doc Claude du projet) pour la vision produit et la roadmap ; ce fichier ne couvre que les règles techniques du code.

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
  - `entities/` — types métier purs : `Book`, `Edition`, `BookDetail`, `LibraryEntry`.
  - `repositories/` — interfaces (ports) : `BookRepository`, `LibraryRepository`. Elles décrivent un contrat, jamais une implémentation.
  - `usecases/` — une fonction par action métier (`searchBooks`, `addBookToLibrary`, `updateLibraryEntry`...). Prennent un repository en premier paramètre (injection par argument, pas de DI framework).
- `src/data/` — implémentations concrètes des interfaces du domain.
  - `openLibrary/` — `OpenLibraryBookRepository` (appels HTTP) + `mappers.ts` (JSON brut → entités du domain) + `types.ts` (formats bruts de l'API, jamais exposés hors de ce dossier).
  - `local/` — `AsyncStorageLibraryRepository`.
- `src/composition/repositories.ts` — **seul fichier autorisé à importer une classe concrète de `data/`**. Instancie `bookRepository` et `libraryRepository`, exportés typés en interfaces du domain.
- `src/store/` — Redux Toolkit. Un slice par domaine fonctionnel (`librarySlice`, `searchSlice`, `bookDetailSlice`). Les thunks appellent des usecases avec les repositories importés depuis `composition/`, jamais depuis `data/` directement.
- `src/screens/`, `src/components/`, `src/navigation/`, `src/theme/` — présentation. Consomment le store via `useAppDispatch`/`useAppSelector` (`src/store/hooks.ts`).

## Règles à respecter

1. **Jamais d'import direct de `data/` depuis `screens/`, `components/` ou `store/`.** Tout passe par `composition/repositories.ts` ou par les types du `domain/`.
2. **Un écran ne fait jamais d'appel réseau ni d'accès AsyncStorage.** Il dispatch une action, un thunk appelle un usecase, le usecase appelle le repository.
3. **Les composants de `components/` restent purement présentationnels.** Ils reçoivent des props déjà résolues (ex. `coverUrl: string`, pas `coverId: number` + un appel à `bookRepository` dans le composant). C'est à l'écran (qui dépend déjà de `composition/`) de résoudre l'URL avant de la passer.
4. **Nouvelle fonctionnalité = un usecase avant un thunk.** Si une action métier n'a pas de fonction dans `domain/usecases/`, elle ne va pas directement dans un thunk Redux.
5. **Nouvelle source de données = une nouvelle classe dans `data/`, jamais un changement d'interface `domain/`** sauf si le besoin métier change réellement (ex. ajouter Google Books = une nouvelle implémentation ou une extension de `BookRepository`, pas un appel `fetch` planqué dans un composant).
6. **Les types bruts d'une API externe (`OpenLibraryDoc`, `RawEdition`...) ne sortent jamais de `data/<source>/types.ts`.** Le mapping vers les entités du domain se fait dans `data/<source>/mappers.ts`.
7. **Un thunk Redux ne fait que : appeler un usecase, retourner son résultat.** La logique (dédoublonnage, fusion, validation) vit dans le usecase, pas dans le thunk ni dans le reducer.

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

## Dossiers obsolètes

`src/api/` et `src/storage/` sont l'ancienne implémentation (avant le passage à Clean Architecture + Redux). Leurs fichiers ont été vidés et commentés ; rien ne les importe. Ils peuvent être supprimés du disque — Claude ne peut pas le faire à distance sur cet environnement, donc ça reste une suppression manuelle.

## Avant de proposer un changement de structure

Ce projet sert aussi de pièce de portfolio technique : la séparation en couches est volontaire et doit rester lisible même si l'app reste petite. Ne pas la simplifier "pour aller plus vite" sans en parler d'abord.
