import type { Book } from './Book';

/**
 * One row of "Découvrir" recommendations, with a human-readable reason
 * explaining why these books were suggested (ex. "Car vous avez lu X et Y",
 * "D'autres classiques du genre Fantasy fiction") — the screen shows the
 * reason as the row's clickable-less header, above a horizontal list of books.
 */
export type RecommendationGroup = {
  id: string;
  title: string;
  books: Book[];
};
