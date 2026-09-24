# Readr

Appli mobile de recherche de livres (React Native + Expo), sans backend ni compte : recherche via l'API publique Open Library, fiche détail avec éditions/formats disponibles, et bibliothèque personnelle stockée localement sur l'appareil.

## Démarrer

Depuis ce dossier, en local (Node ≥ 18) :

```bash
npm install
npx expo install --fix   # aligne les versions natives sur le SDK Expo installé
npx expo install expo-camera   # ajoute le scanner de code-barres (une fois, à la bonne version)
cp .env.example .env     # puis colle ta clé API Google Books dans .env (voir .env.example)
npx expo start
```

Scanne le QR code avec l'app **Expo Go** (iOS/Android) pour lancer l'appli sans build natif.

> **Clé API Google Books** : le repli `findByIsbn` du scanner (voir plus bas) utilise l'API Google Books, qui exige une clé même en lecture seule. Sans clé configurée dans `.env`, ce repli est silencieusement sauté (pas d'erreur) — le scanner reste fonctionnel, juste avec moins de couvertures pour les livres absents d'Open Library. Voir `.env.example` pour la marche à suivre. Toute modification de `.env` nécessite un redémarrage avec `npx expo start -c` (vidage du cache Metro) — un simple reload JS ne suffit pas.

> Les fichiers ont été générés hors ligne (pas d'accès au registre npm depuis l'environnement qui les a écrits), donc les versions de dépendances dans `package.json` sont volontairement larges. `npx expo install --fix` corrige automatiquement toute incohérence de version avant le premier lancement.

## Structure (Clean Architecture + Redux)

- `src/domain/` — cœur métier, aucune dépendance à React Native, Redux ou Open Library
  - `entities/` — `Book`, `Edition`, `BookDetail`, `LibraryEntry`
  - `repositories/` — interfaces `BookRepository` / `LibraryRepository` (ports)
  - `usecases/` — `searchBooks`, `searchBooksInLanguage`, `findBookByIsbn`, `getBookDetail`, `loadLibrary`, `addBookToLibrary`, `removeBookFromLibrary`, `updateLibraryEntry`, `getRecommendations`
- `src/data/` — implémentations concrètes des ports du domain
  - `openLibrary/` — `OpenLibraryBookRepository` (appels HTTP + mapping vers les entités du domain)
  - `googleBooks/` — repli de `findByIsbn` (clé API requise, voir `.env.example`), utilisé quand Open Library (index + catalogue) ne trouve rien ; seule source de repli à fournir une couverture (`Book.coverUrl`)
  - `bnf/` — dernier recours de `findByIsbn`, après Google Books (pas de repository à part entière, juste un client + mapping utilisés en interne par `OpenLibraryBookRepository`)
  - `local/` — `AsyncStorageLibraryRepository` (bibliothèque locale persistée)
- `src/composition/repositories.ts` — seul fichier qui instancie les implémentations concrètes ; tout le reste dépend des interfaces du domain
- `src/store/` — state management Redux Toolkit : `librarySlice`, `searchSlice`, `languageResultsSlice`, `bookDetailSlice`, `discoverSlice`, `scanSlice` (thunks qui appellent les usecases), `store.ts`, `hooks.ts` (`useAppDispatch`/`useAppSelector`)
- `src/theme/` — couleurs, espacements, typographie (thème sombre inspiré de la référence UI)
- `src/utils/` — helpers de présentation partagés entre écrans, sans dépendance à Redux/API (`languageLabels.ts`)
- `src/navigation/` — barre d'onglets (Recherche / Scanner / Découvrir / Ma bibliothèque) + piles de navigation
- `src/screens/` — Recherche, Résultats par langue, Scanner, Découvrir, Fiche livre, Ma bibliothèque (branchées sur le store Redux, plus d'appel direct à l'API ou à AsyncStorage)
- `src/components/` — carte livre, badge de format, étoiles de notation, sélecteur de statut, carrousel de couvertures (purement présentationnels)

Sens de dépendance : `screens/` et `store/` → `domain/` (interfaces) ; `data/` → implémente `domain/` ; `composition/` relie les deux. Aucun écran n'importe `data/` directement.

`src/api/` et `src/storage/` (l'ancienne implémentation Context + appels directs) sont obsolètes et vidés de leur contenu — à supprimer manuellement, rien ne les importe plus.

## Choix techniques (vs. le cahier des charges initial)

- **Redux Toolkit** pour le state partagé (bibliothèque, recherche, détail livre) organisé en **Clean Architecture** (domain / data / composition), à la demande explicite du porteur du projet — remplace le Context + AsyncStorage fait maison de la première version.
- **FlatList** plutôt que FlashList : moins de dépendances tierces à faire correspondre à la main sans pouvoir tester l'installation depuis l'environnement de génération initial. Fonctionnellement équivalent pour ce volume de données ; migrable plus tard si besoin de perf sur de très longues listes.
- Aucune donnée d'audiobook commercial (type Audible) n'existe en accès public : l'appli affiche un badge « disponible en édition audio » uniquement quand Open Library référence un format audio, sans lecteur ni lien d'achat.
- **Découvrir** recommande des livres par auteur : il prend les auteurs déjà présents dans la bibliothèque (les plus récemment ajoutés en premier), relance une recherche Open Library sur chacun, et exclut les livres déjà enregistrés. Recalculé à chaque ajout/retrait dans la bibliothèque. Pas de moteur de recommandation par genre/similarité pour l'instant, faute d'API publique adaptée.
- **Regroupement des doublons de recherche** : Open Library indexe souvent le même livre sous plusieurs fiches "work" distinctes (doublons de catalogage, traductions non reliées à l'œuvre d'origine), ce qui faisait apparaître un même livre plusieurs fois dans les résultats. `docsToBooks` (dans `data/openLibrary/mappers.ts`) regroupe les résultats d'une page par titre + premier auteur normalisés, fusionne leurs identifiants d'œuvre et leurs langues, et la fiche détail agrège ensuite éditions/langues de tous les identifiants fusionnés (`BookRepository.getDetail` prend un tableau d'identifiants). Heuristique, pas une garantie : le regroupement ne se fait qu'au sein d'une page de résultats, jamais entre plusieurs pages, et deux livres différents partageant exactement un titre et un premier auteur seraient (rarement) fusionnés à tort.
  - **Choix de la couverture** : pour un groupe fusionné, `pickCoverId` retient la couverture de la fiche dont `first_publish_year` est le plus récent, plutôt que la première couverture rencontrée. Motivation : pour les classiques du domaine public, la couverture "par défaut" que renvoie Open Library est très souvent celle de la toute première édition numérisée, qui ne ressemble à aucune édition courante. Heuristique faible et non garantie — `first_publish_year` reste un champ par fiche "œuvre" de l'index de recherche, pas l'année précise de l'édition d'où vient la couverture — mais un biais vers le plus récent du groupe est préférable à un choix arbitraire, sans appel réseau supplémentaire. Les couvertures elles-mêmes restent celles qu'Open Library a scannées : pour beaucoup de classiques, aucune édition récente n'a de couverture référencée du tout, auquel cas ce choix ne change rien.
- **Couvertures multiples sur la fiche livre** : les éditions fusionnées d'un même livre (voir regroupement des doublons ci-dessous) peuvent chacune référencer une couverture différente — `Edition.coverId` porte désormais cette info (`data/openLibrary/mappers.ts`). `BookDetailScreen` construit la liste des couvertures connues (`presetCoverUrl` en premier s'il existe, puis `presetCoverId`, puis celles des éditions chargées, dédupliquées) et les passe à `CoverCarousel`, qui affiche une image statique s'il n'y en a qu'une, ou un carrousel swipable avec indicateurs à points sinon. Composant purement présentationnel : reçoit des URLs déjà résolues, jamais de `coverId` ni d'appel à `bookRepository`.
- **Deux représentations de couverture sur `Book`/`LibraryEntry`** : `coverId?: number` suit le schéma numérique d'Open Library (résolu en URL via `bookRepository.coverUrl(id, taille)`) ; `coverUrl?: string` porte une URL déjà résolue, pour les sources qui n'ont pas d'identifiant Open Library (ex. Google Books). Partout où une couverture est affichée, la règle est `book.coverUrl ?? bookRepository.coverUrl(book.coverId, taille)` — `coverUrl` est prioritaire quand il existe.
- **Résultats de recherche regroupés par langue** : `SearchScreen` affiche les résultats en rows horizontales, une par langue (langue principale = `Book.languages[0]`, regroupement fait par `groupByLanguage` dans l'écran), dans l'ordre de première apparition — un tri par nombre de livres réordonnerait les rows à chaque page chargée. Le nom de la langue est cliquable et ouvre `LanguageResultsScreen`, qui ne se contente pas des livres déjà chargés dans la row : il relance une recherche dédiée filtrée côté serveur (`searchBooksInLanguage`, qui ajoute `language:<code>` à la requête Open Library), avec sa propre pagination, pour permettre de vraiment parcourir tous les livres de cette langue. Les labels de langue (`fre` → « Français », etc.) sont centralisés dans `src/utils/languageLabels.ts`, partagés avec la fiche livre.
- **Scanner** utilise `expo-camera` (`CameraView`) pour lire les codes-barres EAN-13 (format Bookland — numériquement l'ISBN-13 des livres, aucune conversion nécessaire). Le code scanné passe par `BookRepository.findByIsbn`, qui relance d'abord une recherche Open Library filtrée par ISBN (`isbn:<code>`) et réutilise le pipeline de regroupement existant. Une fois le livre trouvé, deux boutons ajoutent directement à la bibliothèque en statut « à lire » ou « lu » ; un lien permet aussi d'ouvrir la fiche complète. `expo-camera` a un vrai config plugin (contrairement à `expo-status-bar`/`expo-image`) : il doit rester dans `app.json` → `plugins`, avec le message de permission caméra.
  - **Repli catalogue pour les ISBN absents de l'index de recherche** : l'index de recherche d'Open Library (`search.json`) n'indexe pas toutes les éditions de son propre catalogue — en pratique, beaucoup d'éditions de poche françaises sont invisibles à la recherche alors qu'elles existent bien chez Open Library. Quand `isbn:<code>` ne renvoie rien, `findByIsbn` bascule sur `/isbn/<code>.json`, qui résout directement par clé dans le catalogue brut et a une bien meilleure couverture. Ce repli est plus coûteux (plusieurs appels : édition → œuvre → auteur(s), les noms d'auteur n'étant jamais donnés directement) et moins riche (pas d'année de première publication, pas de fusion multi-éditions), mais suffisant pour identifier et ajouter le livre scanné.
  - **Repli Google Books** : certaines éditions n'existent tout simplement pas chez Open Library, ni dans l'index de recherche ni dans le catalogue brut — constaté en pratique sur *Dracula* chez J'ai lu (ISBN 978-2-290-05740-7), un cas pourtant loin d'être exotique. Open Library reste un catalogue orienté fonds anglophones, avec une couverture inégale des éditions françaises grand public. Quand les deux étapes Open Library échouent, `findByIsbn` interroge l'API Google Books (`data/googleBooks/googleBooksClient.ts`), qui a une bonne couverture internationale et — contrairement à Open Library en échec ou à la BnF — renvoie une vraie couverture (`Book.coverUrl`, voir ci-dessus). Nécessite une clé API configurée dans `.env` (voir `.env.example` et la section Démarrer) : un premier essai anonyme avait été abandonné (429 systématique en test, quota en lecture seule quasi inexistant sans clé) ; avec une clé, l'appel est fiable. Sans clé configurée, ce repli est silencieusement sauté et `findByIsbn` passe directement à la BnF.
  - **Repli BnF en tout dernier recours** : si Google Books ne trouve rien non plus (ou si aucune clé n'est configurée), `findByIsbn` interroge l'API SRU de la Bibliothèque nationale de France (`data/bnf/bnfClient.ts`), qui couvre bien les livres publiés en France sans nécessiter de clé. Pas de JSON côté BnF : la réponse est du XML Dublin Core, extrait par expressions régulières (`data/bnf/xml.ts`) plutôt que d'ajouter une dépendance de parsing XML pour un usage aussi ciblé. Le livre trouvé est ajoutable normalement, mais sans couverture (la BnF n'expose pas d'image par cette API) et sans fiche détail enrichie (pas d'identifiant "œuvre" Open Library à interroger pour les éditions/langues — la fiche affiche juste "aucune édition référencée"). Si même la BnF échoue, le livre est vraiment introuvable par code-barres.

> ⚠️ **`app.json` → `plugins`** ne doit lister que des paquets qui exportent réellement un config plugin (vérifiable via `node_modules/<paquet>/package.json` → `main`/`exports` pointant vers `app.plugin.js`). En lister un qui n'en a pas fait planter `expo start` (voir l'historique du projet) — `expo-camera` en a un, `expo-status-bar` et `expo-image` n'en ont pas.

## Prochaines étapes possibles

Voir la section Roadmap du cahier des charges (doc Claude) : mode sombre/clair, LibriVox pour les audiobooks du domaine public, partage vers d'autres applis, widget d'écran d'accueil.
