import { FirebaseAuthRepository } from '../data/firebase/FirebaseAuthRepository';
import { FirestoreLibraryRepository } from '../data/firebase/FirestoreLibraryRepository';
import { GoogleSignInProvider } from '../data/google/GoogleSignInProvider';
import { AsyncStorageLibraryRepository } from '../data/local/AsyncStorageLibraryRepository';
import { OpenLibraryBookRepository } from '../data/openLibrary/OpenLibraryBookRepository';
import type { AuthRepository } from '../domain/repositories/AuthRepository';
import type { BookRepository } from '../domain/repositories/BookRepository';
import type { GoogleIdentityProvider } from '../domain/repositories/GoogleIdentityProvider';
import type { LibraryRepository } from '../domain/repositories/LibraryRepository';
import type { LibrarySyncRepository } from '../domain/repositories/LibrarySyncRepository';

// The only file in the app allowed to import a concrete `data/` implementation.
// Everywhere else (Redux slices, screens) depends on the domain interfaces above,
// so swapping Open Library or AsyncStorage for something else touches only this file.
export const bookRepository: BookRepository = new OpenLibraryBookRepository();
export const libraryRepository: LibraryRepository = new AsyncStorageLibraryRepository();
export const authRepository: AuthRepository = new FirebaseAuthRepository();
export const librarySyncRepository: LibrarySyncRepository = new FirestoreLibraryRepository();
export const googleIdentityProvider: GoogleIdentityProvider = new GoogleSignInProvider();
