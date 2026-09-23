import type { NavigatorScreenParams } from '@react-navigation/native';

/** Params shared by any stack that can push the book detail screen. */
export type BookDetailParams = {
  workKey: string;
  // Passed along so the detail screen can render instantly while it
  // fetches the fuller description and editions in the background.
  presetTitle: string;
  presetAuthors: string[];
  presetCoverId?: number;
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
