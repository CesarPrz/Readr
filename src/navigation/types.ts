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
  presetLanguages: string[];
};

/** Ouvert depuis l'en-tête cliquable d'un regroupement par langue des résultats de recherche. */
export type LanguageResultsParams = {
  query: string; // la recherche d'origine, réutilisée avec le filtre `language:<code>` en plus
  language: string; // code langue Open Library, ex. "fre"
};

export type SearchStackParamList = {
  SearchHome: undefined;
  LanguageResults: LanguageResultsParams;
  BookDetail: BookDetailParams;
};

export type ScanStackParamList = {
  ScanHome: undefined;
  BookDetail: BookDetailParams;
};

export type DiscoverStackParamList = {
  DiscoverHome: undefined;
  BookDetail: BookDetailParams;
};

export type LibraryStackParamList = {
  LibraryHome: undefined;
  BookDetail: BookDetailParams;
};

export type RootTabParamList = {
  Recherche: NavigatorScreenParams<SearchStackParamList>;
  Scanner: NavigatorScreenParams<ScanStackParamList>;
  Découvrir: NavigatorScreenParams<DiscoverStackParamList>;
  'Ma bibliothèque': NavigatorScreenParams<LibraryStackParamList>;
};
