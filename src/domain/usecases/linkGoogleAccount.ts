import type { LibraryEntry } from '../entities/LibraryEntry';
import type { ReadingList } from '../entities/ReadingList';
import type { UserProfile } from '../entities/UserProfile';
import type { AuthRepository } from '../repositories/AuthRepository';
import type { GoogleIdentityProvider } from '../repositories/GoogleIdentityProvider';
import type { LibraryRepository } from '../repositories/LibraryRepository';
import type { LibrarySyncRepository } from '../repositories/LibrarySyncRepository';
import type { ListRepository } from '../repositories/ListRepository';
import type { ListSyncRepository } from '../repositories/ListSyncRepository';
import { withTimeout } from '../../utils/withTimeout';
import { seedDefaultLists } from './seedDefaultLists';

/** Au-delà de ça, on considère Firestore injoignable plutôt que de laisser l'utilisateur bloqué indéfiniment — voir `withTimeout`. */
const RESTORE_TIMEOUT_MS = 15000;

/**
 * Résultat de `linkGoogleAccount` :
 * - `cancelled` — l'utilisateur a annulé le flux Google (pas une erreur).
 * - `linked` — liaison réussie sur la session anonyme courante, même `uid`.
 * - `switched` — ce compte Google était déjà utilisé par un AUTRE profil
 *   Readr : l'app a basculé vers ce compte existant et restauré sa
 *   bibliothèque/ses listes depuis Firestore (voir
 *   `AuthRepository.linkWithGoogle`). `entries`/`lists` portent déjà les
 *   données restaurées, prêtes à remplacer l'état Redux — voir `authSlice`.
 */
export type LinkGoogleAccountResult =
  | { status: 'cancelled' }
  | { status: 'linked'; profile: UserProfile }
  | { status: 'switched'; profile: UserProfile; entries: LibraryEntry[]; lists: ReadingList[] };

/**
 * Lie le compte Google de l'utilisateur à sa session anonyme existante
 * (Phase 3 du plan Firebase, doc Claude du projet, "firebase-social-plan").
 * Déclenché uniquement depuis l'écran Profil, à l'initiative explicite de
 * l'utilisateur — jamais automatiquement, voir le principe UX de connexion
 * non intrusive.
 *
 * Si ce compte Google est déjà utilisé par un autre profil Readr,
 * `AuthRepository.linkWithGoogle` bascule automatiquement vers ce compte
 * existant plutôt que d'échouer (revirement par rapport à la décision
 * initiale "l'utilisateur est juste informé, pas de fusion" — voir le plan
 * Firebase, section "Bascule vers un compte existant"). Ce usecase orchestre
 * alors, en plus de l'auth, la restauration complète depuis Firestore
 * (`fetchAll`) et le remplacement des données locales (`saveAll`) : la
 * session anonyme abandonnée n'a plus de raison d'être affichée une fois
 * l'identité changée — décision produit assumée, on écrase plutôt que de
 * fusionner les deux bibliothèques (la fusion reste hors sujet, voir le
 * plan). Orchestrer 5 ports dans un seul usecase reste dans l'esprit de
 * `deleteReadingList` (qui en orchestre 2) : une seule action utilisateur,
 * un seul usecase, même si plusieurs repositories sont concernés.
 */
export async function linkGoogleAccount(
  googleProvider: GoogleIdentityProvider,
  authRepo: AuthRepository,
  libraryRepo: LibraryRepository,
  listRepo: ListRepository,
  librarySyncRepo: LibrarySyncRepository,
  listSyncRepo: ListSyncRepository,
): Promise<LinkGoogleAccountResult> {
  console.log('[Readr][debug bascule] linkGoogleAccount: appel googleProvider.signIn()...');
  const result = await googleProvider.signIn();
  console.log('[Readr][debug bascule] googleProvider.signIn() a répondu :', result ? 'idToken reçu' : 'annulé (null)');
  if (!result) return { status: 'cancelled' };

  console.log('[Readr][debug bascule] appel authRepo.linkWithGoogle()...');
  const { profile, switchedToExistingAccount } = await authRepo.linkWithGoogle(result.idToken);
  console.log('[Readr][debug bascule] authRepo.linkWithGoogle() a répondu, switched =', switchedToExistingAccount);
  if (!switchedToExistingAccount) return { status: 'linked', profile };

  console.log('[Readr][debug bascule] restauration : fetchAll bibliothèque + listes pour uid', profile.uid);
  const [entries, cloudLists] = await withTimeout(
    Promise.all([librarySyncRepo.fetchAll(profile.uid), listSyncRepo.fetchAll(profile.uid)]),
    RESTORE_TIMEOUT_MS,
    'La restauration de ta bibliothèque a pris trop de temps. Vérifie ta connexion et réessaie — si le problème persiste, vérifie que la base Firestore existe bien pour ce projet.',
  );
  console.log(
    '[Readr][debug bascule] fetchAll terminé :',
    entries.length,
    'livres,',
    cloudLists.length,
    'listes reçues',
  );
  await Promise.all([libraryRepo.saveAll(entries), listRepo.saveAll(cloudLists)]);
  console.log('[Readr][debug bascule] saveAll local terminé');

  // Un compte existant antérieur à "Listes de lecture publiques" (ou dont les
  // listes n'ont jamais atteint Firestore, ex. règles pas encore collées)
  // peut n'avoir aucune liste côté cloud. `seedDefaultLists` s'appuie sur son
  // propre critère d'idempotence ("aucune liste locale", voir sa doc) pour
  // recréer les 4 listes par défaut plutôt que de laisser l'utilisateur sans
  // onglet dans `LibraryScreen` — cas limite, pas le chemin attendu.
  const lists = cloudLists.length > 0 ? cloudLists : await seedDefaultLists(listRepo);
  if (cloudLists.length === 0) {
    console.log('[Readr][debug bascule] aucune liste cloud, seedDefaultLists + upload des 4 listes par défaut');
    await Promise.all(lists.map((list) => listSyncRepo.upsertList(profile.uid, list)));
  }

  console.log('[Readr][debug bascule] linkGoogleAccount terminé, status switched');
  return { status: 'switched', profile, entries, lists };
}
