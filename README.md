# Readr

Appli mobile de recherche de livres (React Native + Expo), sans backend ni compte : recherche via l'API publique Open Library, fiche détail avec éditions/formats disponibles, et bibliothèque personnelle stockée localement sur l'appareil.

## Démarrer

Depuis ce dossier, en local (Node ≥ 18) :

```bash
npm install
npx expo install --fix   # aligne les versions natives sur le SDK Expo installé
npx expo start
```

Scanne le QR code avec l'app **Expo Go** (iOS/Android) pour lancer l'appli sans build natif.

> Les fichiers ont été générés hors ligne (pas d'accès au registre npm depuis l'environnement qui les a écrits), donc les versions de dépendances dans `package.json` sont volontairement larges. `npx expo install --fix` corrige automatiquement toute incohérence de version avant le premier lancement.

## Structure (Clean Architecture + Redux)

- `src/domain/` — cœur métier, aucune dépendance à React Native, Redux ou Open Library
  - `entities/` — `Book`, `Edition`, `BookDetail`, `LibraryEntry`
  - `repositories/` — interfaces `BookRepository` / `LibraryRepository` (ports)
  - `usecases/` — `searchBooks`, `getBookDetail`, `loadLibrary`, `addBookToLibrary`, `removeBookFromLibrary`, `updateLibraryEntry`, `getRecommendations`
- `src/data/` — implémentations concrètes des ports du domain
  - `openLibrary/` — `OpenLibraryBookRepository` (appels HTTP + mapping vers les entités du domain)
  - `local/` — `AsyncStorageLibraryRepository` (bibliothèque locale persistée)
- `src/composition/repositories.ts` — seul fichier qui instancie les implémentations concrètes ; tout le reste dépend des interfaces du domain
- `src/store/` — state management Redux Toolkit : `librarySlice`, `searchSlice`, `bookDetailSlice`, `discoverSlice` (thunks qui appellent les usecases), `store.ts`, `hooks.ts` (`useAppDispatch`/`useAppSelector`)
- `src/theme/` — couleurs, espacements, typographie (thème sombre inspiré de la référence UI)
- `src/navigation/` — barre d'onglets (Recherche / Découvrir / Ma bibliothèque) + piles de navigation
- `src/screens/` — Recherche, Découvrir, Fiche livre, Ma bibliothèque (branchées sur le store Redux, plus d'appel direct à l'API ou à AsyncStorage)
- `src/components/` — carte livre, badge de format, étoiles de notation, sélecteur de statut (purement présentationnels)

Sens de dépendance : `screens/` et `store/` → `domain/` (interfaces) ; `data/` → implémente `domain/` ; `composition/` relie les deux. Aucun écran n'importe `data/` directement.

`src/api/` et `src/storage/` (l'ancienne implémentation Context + appels directs) sont obsolètes et vidés de leur contenu — à supprimer manuellement, rien ne les importe plus.

## Choix techniques (vs. le cahier des charges initial)

- **Redux Toolkit** pour le state partagé (bibliothèque, recherche, détail livre) organisé en **Clean Architecture** (domain / data / composition), à la demande explicite du porteur du projet — remplace le Context + AsyncStorage fait maison de la première version.
- **FlatList** plutôt que FlashList : moins de dépendances tierces à faire correspondre à la main sans pouvoir tester l'installation depuis l'environnement de génération initial. Fonctionnellement équivalent pour ce volume de données ; migrable plus tard si besoin de perf sur de très longues listes.
- Aucune donnée d'audiobook commercial (type Audible) n'existe en accès public : l'appli affiche un badge « disponible en édition audio » uniquement quand Open Library référence un format audio, sans lecteur ni lien d'achat.
- **Découvrir** recommande des livres par auteur : il prend les auteurs déjà présents dans la bibliothèque (les plus récemment ajoutés en premier), relance une recherche Open Library sur chacun, et exclut les livres déjà enregistrés. Recalculé à chaque ajout/retrait dans la bibliothèque. Pas de moteur de recommandation par genre/similarité pour l'instant, faute d'API publique adaptée.

## Prochaines étapes possibles

Voir la section Roadmap du cahier des charges (doc Claude) : mode sombre/clair, LibriVox pour les audiobooks du domaine public, partage vers d'autres applis, widget d'écran d'accueil.
