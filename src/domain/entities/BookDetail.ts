import type { Edition } from './Edition';

/** Enrichment data fetched for a single book once its detail screen opens. */
export type BookDetail = {
  id: string;
  description?: string;
  editions: Edition[];
  hasAudioEdition: boolean;
  languages: string[]; // derived from the fetched editions across every merged work key
  // Sujets Open Library, tels quels (liste libre : genres, thèmes, prix
  // littéraires... mélangés, pas une taxonomie de genres propre). Utilisé par
  // `getRecommendations` pour la recommandation "D'autres classiques du genre
  // X" — pas affiché tel quel ailleurs dans l'app.
  subjects: string[];
};
