import { AsyncStorageLibraryRepository } from '../data/local/AsyncStorageLibraryRepository';
import { OpenLibraryBookRepository } from '../data/openLibrary/OpenLibraryBookRepository';
import type { BookRepository } from '../domain/repositories/BookRepository';
import type { LibraryRepository } from '../domain/repositories/LibraryRepository';

// The only file in the app allowed to import a concrete `data/` implementation.
// Everywhere else (Redux slices, screens) depends on the domain interfaces above,
// so swapping Open Library or AsyncStorage for something else touches only this file.
export const bookRepository: BookRepository = new OpenLibraryBookRepository();
export const libraryRepository: LibraryRepository = new AsyncStorageLibraryRepository();
