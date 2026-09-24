/** One published edition of a book (a specific format/printing). */
export type Edition = {
  id: string;
  formatLabel: string;
  publisher?: string; // ex. "Le Livre de Poche" — pas toujours renseigné par Open Library
  coverId?: number; // couverture propre à cette édition, si Open Library en référence une
};
