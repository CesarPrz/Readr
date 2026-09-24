/** One published edition of a book (a specific format/printing). */
export type Edition = {
  id: string;
  formatLabel: string;
  coverId?: number; // couverture propre à cette édition, si Open Library en référence une
};
