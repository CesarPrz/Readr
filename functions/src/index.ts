import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { recomputeBookStats } from './recomputeBookStats';

admin.initializeApp();

/**
 * Recalcule `bookStats/*` chaque nuit — voir `recomputeBookStats.ts` pour le
 * détail de l'algorithme et le plan Firebase (doc Claude du projet, section
 * "Recommandations collaboratives") pour la décision produit.
 *
 * Planifié plutôt que déclenché à chaque écriture (`onDocumentWritten`) : un
 * recalcul complet à chaque like/ajout coûterait beaucoup plus cher (une
 * passe sur TOUTE la bibliothèque de tout le monde à chaque écriture d'un
 * seul utilisateur) pour un gain de fraîcheur qui ne compte pas vraiment ici
 * — même principe déjà acté pour "Le serveur fait foi" (deux déclencheurs
 * précis plutôt que du temps réel).
 */
export const scheduledRecomputeBookStats = onSchedule('every 24 hours', async () => {
  const result = await recomputeBookStats(admin.firestore());
  console.log(
    `[Readr] recomputeBookStats (planifié) : ${result.usersConsidered} utilisateur(s), ${result.booksWithStats} livre(s) avec des statistiques.`,
  );
});

/**
 * Déclenchement manuel, pour tester sans attendre le prochain passage
 * planifié (ex. `curl "https://<url-de-la-fonction>?secret=..."` après avoir
 * ajouté quelques livres "aimés" de test sur deux comptes différents — la
 * co-occurrence ne compte jamais au sein d'un seul compte). Protégé par un
 * secret partagé simple (`RECOMPUTE_SECRET`, voir `.env.example`) : pas un
 * vrai besoin de sécurité, seulement pour éviter qu'un appel découvert par
 * hasard ne déclenche des recalculs à répétition.
 */
export const recomputeBookStatsManually = onRequest(async (req, res) => {
  if (!process.env.RECOMPUTE_SECRET || req.query.secret !== process.env.RECOMPUTE_SECRET) {
    res.status(403).send('Secret manquant ou invalide (voir functions/.env.example).');
    return;
  }

  const result = await recomputeBookStats(admin.firestore());
  res.status(200).json(result);
});
