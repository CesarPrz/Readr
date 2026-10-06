import type { User } from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '../../domain/entities/UserProfile';
import type { LibraryEntry } from '../../domain/entities/LibraryEntry';
import type { ReadingList } from '../../domain/entities/ReadingList';

/** `firebase/auth`'s `User` → `UserProfile` du domain. Même séparation raw-types/mapping que les autres sources de `data/`. */
export function toUserProfile(user: User): UserProfile {
  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    displayName: user.displayName ?? undefined,
    photoUrl: user.photoURL ?? undefined,
  };
}

/**
 * `LibraryEntry` du domain → document Firestore public
 * (`users/{uid}/library/{bookId}`, voir le plan Firebase, doc Claude du
 * projet, section "Listes de lecture publiques"). Depuis cette section,
 * `listIds` (appartenance aux listes) et `note` rejoignent les champs
 * synchronisés : `note` n'est plus locale-only comme en Phase 2, décision
 * produit assumée — elle devient visible par les autres utilisateurs au
 * même titre que le reste, ces listes étant en lecture publique.
 *
 * `description`/`languages`/`workKeys`/`addedAt` rejoignent à leur tour les
 * champs synchronisés depuis "Bascule vers un compte existant" (voir plan
 * Firebase) : sans eux, restaurer une bibliothèque depuis Firestore
 * (`fetchAll`, utilisé par `linkGoogleAccount` quand la liaison bascule vers
 * un compte existant) donnerait des entrées incomplètes, inutilisables sur
 * la fiche détail (pas d'édition à recharger). Une entrée synchronisée
 * *avant* ce changement n'aura ces champs qu'après sa prochaine écriture
 * locale (ex. un nouveau statut) — pas de backfill rétroactif.
 *
 * `?? null` partout où le champ est optionnel : Firestore refuse `undefined`
 * comme valeur de champ (l'écriture échouerait), contrairement à un objet JS
 * ordinaire.
 */
export function toFirestoreLibraryEntry(entry: LibraryEntry) {
  return {
    title: entry.title,
    authors: entry.authors,
    coverId: entry.coverId ?? null,
    coverUrl: entry.coverUrl ?? null,
    description: entry.description ?? null,
    languages: entry.languages,
    workKeys: entry.workKeys,
    listIds: entry.listIds,
    rating: entry.rating ?? null,
    note: entry.note ?? null,
    addedAt: entry.addedAt,
    // `?? addedAt` : les entrées antérieures au fil d'amis n'ont pas encore de
    // `activityAt` ; la sauvegarde en masse du démarrage le renseigne ainsi
    // pour elles (sans quoi la requête `orderBy('activityAt')` du fil, qui
    // ignore les documents sans ce champ, ne les verrait jamais).
    activityAt: entry.activityAt ?? entry.addedAt,
    updatedAt: serverTimestamp(),
  };
}

/**
 * Document Firestore public → `LibraryEntry` du domain — sens inverse de
 * `toFirestoreLibraryEntry`, utilisé uniquement par `fetchAll` (voir
 * `LibrarySyncRepository`) pour restaurer une bibliothèque complète quand la
 * liaison Google bascule vers un compte existant. `id` vient de l'id du
 * document (`bookId`), jamais stocké comme champ. Lecture défensive (le
 * document Firestore n'a pas de type garanti côté client, et des documents
 * écrits avant l'ajout de `workKeys`/`description`/`languages`/`addedAt`
 * peuvent en manquer) : valeur de repli plutôt qu'une exception.
 */
export function fromFirestoreLibraryEntry(id: string, data: Record<string, unknown>): LibraryEntry {
  return {
    id,
    workKeys: Array.isArray(data.workKeys) ? (data.workKeys as string[]) : [],
    title: typeof data.title === 'string' ? data.title : '',
    authors: Array.isArray(data.authors) ? (data.authors as string[]) : [],
    coverId: typeof data.coverId === 'number' ? data.coverId : undefined,
    coverUrl: typeof data.coverUrl === 'string' ? data.coverUrl : undefined,
    description: typeof data.description === 'string' ? data.description : undefined,
    languages: Array.isArray(data.languages) ? (data.languages as string[]) : [],
    listIds: Array.isArray(data.listIds) ? (data.listIds as string[]) : [],
    rating: typeof data.rating === 'number' ? data.rating : undefined,
    note: typeof data.note === 'string' ? data.note : undefined,
    addedAt: typeof data.addedAt === 'string' ? data.addedAt : new Date().toISOString(),
    activityAt: typeof data.activityAt === 'string' ? data.activityAt : undefined,
  };
}

/**
 * `ReadingList` du domain → document Firestore public
 * (`users/{uid}/lists/{listId}`) — voir `ListSyncRepository` pour le
 * contrat de lecture publique/écriture propriétaire. `createdAt` rejoint les
 * champs synchronisés depuis "Bascule vers un compte existant" (voir plan
 * Firebase) : nécessaire pour reconstituer l'ordre d'affichage des listes
 * perso (voir `LibraryScreen`) une fois restaurées depuis Firestore.
 */
export function toFirestoreReadingList(list: ReadingList) {
  return {
    name: list.name,
    isDefault: list.isDefault,
    exclusive: list.exclusive,
    createdAt: list.createdAt,
    updatedAt: serverTimestamp(),
  };
}

/**
 * Document Firestore public → `ReadingList` du domain — sens inverse de
 * `toFirestoreReadingList`, même usage et même prudence de lecture que
 * `fromFirestoreLibraryEntry` (voir sa doc). Une liste écrite avant l'ajout
 * de `createdAt` au document se voit attribuer la date de restauration : pas
 * exact, mais un ordre d'affichage stable est plus important qu'une date
 * d'origine perdue pour de si vieux documents.
 */
export function fromFirestoreReadingList(id: string, data: Record<string, unknown>): ReadingList {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    isDefault: Boolean(data.isDefault),
    exclusive: Boolean(data.exclusive),
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
  };
}
