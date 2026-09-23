/** A book as surfaced by search — enough to render a result card and open the detail screen. */
export type Book = {
  id: string; // catalog work key, e.g. "/works/OL12345W"
  title: string;
  authors: string[];
  coverId?: number;
  firstPublishYear?: number;
};
