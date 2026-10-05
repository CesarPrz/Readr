import type { LibraryEntry } from '../entities/LibraryEntry';
import type { LibraryRepository } from '../repositories/LibraryRepository';
import type { LibrarySyncRepository } from '../repositories/LibrarySyncRepository';

/**
 * Rafraîchit la bibliothèque locale depuis Firestore, qui fait foi (revirement
 * documenté dans le plan Firebase, doc Claude du projet, section "Le serveur
 * fait foi" : avant cette section, `LibraryRepository` local était la seule
 * source de vérité pendant l'utilisation normale). Déclenché à deux moments
 * précis seulement — démarrage de l'app et ouverture de l'onglet Bibliothèque
 * (voir `App.tsx` et `LibraryScreen.tsx`) — jamais en continu/temps réel,
 * décision produit assumée pour limiter le coût réseau.
 *
 * Best-effort et silencieux, comme le reste de la synchronisation cloud (voir
 * `syncLibraryEntry`) : si Firestore est injoignable (hors ligne, erreur), la
 * copie locale déjà affichée à l'écran reste inchangée — retourne `null`
 * plutôt que de lancer, jamais de spinner ni d'alerte pour ça (voir
 * `withTimeout` pour la seule exception, la restauration bloquante de
 * `linkGoogleAccount`, un cas différent déclenché par une action explicite).
 *
 * Écrase la copie locale (`saveAll`) sans fusion en cas de succès, même
 * logique que `linkGoogleAccount` : le serveur fait foi, le local n'est plus
 * qu'une sauvegarde de secours hors-ligne, pas question de la fusionner avec
 * une réponse serveur plus récente.
 *
 * **`shouldApply` — garde-fou contre une course avec une mutation locale en
 * cours (bug rencontré et corrigé le 29/09/2026)** : `fetchAll` prend un
 * temps non négligeable (aller-retour réseau), pendant lequel l'utilisateur
 * peut très bien ajouter/aimer un livre depuis un autre écran — cette
 * mutation locale met à jour Redux immédiatement, mais sa sauvegarde cloud
 * (`syncLibraryEntry`) est elle-même en tâche de fond, jamais attendue (voir
 * `librarySlice`). Sans garde-fou, le résultat de CE `fetchAll` (lancé avant
 * cette mutation, donc encore sans elle) écrasait `entries` juste après coup
 * — le livre tout juste ajouté disparaissait de l'écran. L'appelant
 * (`librarySlice.refreshLibrary`) passe ici une fonction qui revérifie, une
 * fois le `fetchAll` terminé, qu'aucune mutation locale n'a eu lieu depuis
 * le début du cycle complet (push inclus) — si `shouldApply()` renvoie
 * `false`, le résultat est jeté sans toucher ni à `saveAll` ni à Redux :
 * le prochain déclencheur (prochain focus de l'onglet, ou prochain démarrage)
 * referra un cycle complet avec cette fois la mutation incluse.
 */
export async function refreshLibraryFromServer(
  librarySyncRepo: LibrarySyncRepository,
  libraryRepo: LibraryRepository,
  uid: string | undefined,
  shouldApply: () => boolean,
): Promise<LibraryEntry[] | null> {
  if (!uid) return null;
  try {
    const entries = await librarySyncRepo.fetchAll(uid);
    if (!shouldApply()) {
      console.log(
        '[Readr][debug sync] refreshLibraryFromServer: résultat ignoré (une mutation locale a eu lieu pendant le cycle push/pull)',
      );
      return null;
    }
    await libraryRepo.saveAll(entries);
    return entries;
  } catch {
    // Hors ligne, ou Firestore injoignable/mal configuré — la copie locale
    // déjà affichée reste la référence pour cette fois, voir la doc ci-dessus.
    return null;
  }
}
