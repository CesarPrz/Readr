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

## Structure

- `src/api/` — appels à l'API Open Library (recherche, détail d'œuvre, éditions, URL de couverture)
- `src/storage/` — bibliothèque locale (AsyncStorage) + contexte React pour les composants
- `src/theme/` — couleurs, espacements, typographie (thème sombre inspiré de la référence UI)
- `src/navigation/` — barre d'onglets (Recherche / Ma bibliothèque) + piles de navigation
- `src/screens/` — Recherche, Fiche livre, Ma bibliothèque
- `src/components/` — carte livre, badge de format, étoiles de notation, sélecteur de statut

## Choix techniques (vs. le cahier des charges initial)

- **FlatList** plutôt que FlashList, et **Context + AsyncStorage** plutôt que React Query : moins de dépendances tierces à faire correspondre à la main sans pouvoir tester l'installation depuis l'environnement de génération. Fonctionnellement équivalent pour ce volume de données ; à migrer facilement plus tard si besoin de perf sur de très longues listes.
- Aucune donnée d'audiobook commercial (type Audible) n'existe en accès public : l'appli affiche un badge « disponible en édition audio » uniquement quand Open Library référence un format audio, sans lecteur ni lien d'achat.

## Prochaines étapes possibles

Voir la section Roadmap du cahier des charges (doc Claude) : mode sombre/clair, LibriVox pour les audiobooks du domaine public, partage vers d'autres applis, widget d'écran d'accueil.
