import type { UserProfile } from '../entities/UserProfile';
import type { AuthRepository } from '../repositories/AuthRepository';

/**
 * Connexion anonyme silencieuse au démarrage de l'app — voir le principe UX
 * de connexion non intrusive (doc Claude du projet, "firebase-social-plan") :
 * ne déclenche jamais d'écran ni de demande à l'utilisateur, juste une
 * identité technique en tâche de fond pour préparer la sauvegarde cloud
 * (Phase 2) et les fonctionnalités sociales (Phase 4+).
 */
export async function ensureSignedIn(repo: AuthRepository): Promise<UserProfile> {
  return repo.ensureSignedIn();
}
