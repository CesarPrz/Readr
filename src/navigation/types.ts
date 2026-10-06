import type { NavigatorScreenParams } from '@react-navigation/native';

/** Params shared by any stack that can push the book detail screen. */
export type BookDetailParams = {
  workKey: string; // primary work key — this book's identity for the library and this route
  presetWorkKeys: string[]; // every work key merged into this book (see Book.workKeys), used to fetch/merge full detail
  // Passed along so the detail screen can render instantly while it
  // fetches the fuller description, editions and languages in the background.
  presetTitle: string;
  presetAuthors: string[];
  presetCoverId?: number;
  presetCoverUrl?: string; // voir Book.coverUrl — livres venus d'une source sans coverId Open Library (ex. Google Books)
  presetDescription?: string; // voir Book.description — résumé déjà connu, pour les livres sans fiche "œuvre" Open Library
  presetLanguages: string[];
};

/** Ouvert depuis l'en-tête cliquable d'un regroupement par langue des résultats de recherche. */
export type LanguageResultsParams = {
  query: string; // la recherche d'origine, réutilisée avec le filtre `language:<code>` en plus
  language: string; // code langue Open Library, ex. "fre"
};

/** Profil public d'un autre utilisateur, ouvert depuis un résultat de la recherche d'utilisateurs — les champs preset permettent d'afficher l'en-tête avant la fin du chargement. */
export type UserProfileParams = {
  uid: string;
  username: string;
  photoUrl?: string;
  bio?: string;
};

/** Contenu d'une liste de lecture d'un autre utilisateur (lecture seule), ouvert depuis son profil public. */
export type UserListParams = {
  uid: string;
  listId: string;
  listName: string;
};

/**
 * Écrans partagés par TOUTE pile qui peut ouvrir le profil d'un autre
 * utilisateur (recherche d'utilisateurs, fil d'amis) : `UserProfileScreen`/
 * `UserListScreen` sont typés sur cette liste commune plutôt que sur celle
 * d'une pile précise, ce qui leur permet d'être enregistrés dans plusieurs.
 */
export type PublicProfileStackParamList = {
  UserProfile: UserProfileParams;
  UserList: UserListParams;
  BookDetail: BookDetailParams;
};

export type SearchStackParamList = {
  SearchHome: undefined;
  LanguageResults: LanguageResultsParams;
} & PublicProfileStackParamList;

/** "Fil d'amis" (08/10/2026) : l'écran du fil, plus les écrans partagés pour ouvrir un livre ou le profil d'un lecteur depuis une ligne. */
export type FeedStackParamList = {
  FeedHome: undefined;
} & PublicProfileStackParamList;

export type ScanStackParamList = {
  ScanHome: undefined;
  BookDetail: BookDetailParams;
};

export type DiscoverStackParamList = {
  DiscoverHome: undefined;
  BookDetail: BookDetailParams;
};

/** Contenu d'une liste de lecture (style "playlist"), ouvert depuis la ligne correspondante sur `LibraryScreen`. */
export type ListDetailParams = {
  listId: string;
  listName: string; // affiché immédiatement comme titre d'écran, avant tout re-rendu depuis le store
  isDefault: boolean; // conditionne l'affichage du bouton de suppression dans l'en-tête
};

export type LibraryStackParamList = {
  LibraryHome: undefined;
  ListDetail: ListDetailParams;
  BookDetail: BookDetailParams;
};

// L'onglet Profil dédié (Phase 3 du plan Firebase) et son
// `ProfilStackParamList` ont disparu avec "Profil fusionné" (07/10/2026) :
// le profil (avatar, pseudo, connexion Google) vit désormais en en-tête de
// `LibraryStackParamList.LibraryHome`, voir `ProfileHeader.tsx` et
// `LibraryScreen.tsx`.

export type RootTabParamList = {
  Recherche: NavigatorScreenParams<SearchStackParamList>;
  Scanner: NavigatorScreenParams<ScanStackParamList>;
  Découvrir: NavigatorScreenParams<DiscoverStackParamList>;
  Fil: NavigatorScreenParams<FeedStackParamList>;
  'Ma bibliothèque': NavigatorScreenParams<LibraryStackParamList>;
};
