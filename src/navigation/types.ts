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
  presetLanguages: string[];
};

export type SearchStackParamList = {
  SearchHome: undefined;
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
  Découvrir: NavigatorScreenParams<DiscoverStackParamList>;
  'Ma bibliothèque': NavigatorScreenParams<LibraryStackParamList>;
};
