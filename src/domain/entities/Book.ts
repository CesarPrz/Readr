/** A book as surfaced by search — enough to render a result card and open the detail screen. */
export type Book = {
  id: string; // primary catalog work key — this book's identity for navigation and the library
  workKeys: string[]; // every catalog work key merged into this result (duplicate/translated work records combined into one book)
  title: string;
  authors: string[];
  coverId?: number;
  firstPublishYear?: number;
  languages: string[]; // language codes aggregated across the merged works, e.g. ['eng', 'fre']
};
