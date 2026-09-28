import type { GoogleIdentityProvider } from '../../domain/repositories/GoogleIdentityProvider';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

// `require` est fourni par Metro à l'exécution (RN) ; ce projet n'a pas
// `@types/node` en dépendance (inutile ailleurs) — déclaration locale
// minimale plutôt que d'ajouter une dépendance juste pour ce type.
declare const require: (id: string) => unknown;

/**
 * Implémente `GoogleIdentityProvider` via la lib native
 * `@react-native-google-signin/google-signin` — nécessite un dev client
 * (voir CLAUDE.md, section "Phase 3" : exception documentée à la contrainte
 * Expo Go, cette lib ne fonctionne pas dans Expo Go).
 *
 * **`require()` volontairement DANS les méthodes, jamais un `import` en haut
 * de fichier — leçon apprise à la dure.** Ce fichier est chargé par
 * `composition/repositories.ts`, donc par toute l'app, y compris en Expo Go
 * (Phases 1/2/4+, voir l'avertissement en tête de `CLAUDE.md`). Un premier
 * essai avec `configure()` appelé paresseusement, mais un `import` classique
 * de la lib en haut de fichier, a quand même fait planter l'app au démarrage
 * en Expo Go avec `Invariant violation : TurbomoduleRegistry.getEnforcing(...):
 * 'RNGoogleSignin' could not be found` : cette lib référence son module natif
 * dès l'évaluation de son PROPRE code (son spec TurboModule fait
 * `TurboModuleRegistry.getEnforcing(...)` au chargement du fichier, pas
 * seulement quand on appelle une de ses fonctions) — un simple `import`
 * suffit à planter, avant même d'atteindre `configure()` ou l'écran Profil.
 * Un `require()` écrit À L'INTÉRIEUR d'une méthode (ici `load()`) n'est
 * exécuté qu'à l'appel de cette méthode : tant que personne n'appuie sur
 * "Se connecter avec Google", le module n'est jamais chargé, donc jamais
 * évalué, donc ne peut pas planter l'app au démarrage.
 */
export class GoogleSignInProvider implements GoogleIdentityProvider {
  private configured = false;

  private load(): GoogleSigninModule {
    return require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  }

  private ensureConfigured(GoogleSignin: GoogleSigninModule['GoogleSignin']): void {
    if (this.configured) return;
    // webClientId : client OAuth de type "Web" — pas le client Android ni
    // iOS. C'est lui qui permet d'obtenir un `idToken` exploitable par
    // `GoogleAuthProvider.credential()` côté Firebase (sans lui, `idToken`
    // reste `null` dans la réponse de `signIn()`). Une fois "Google" activé
    // comme fournisseur dans Firebase Console → Authentication → Sign-in
    // method, Firebase crée ce client automatiquement — sa valeur est
    // visible juste en dessous, sous "Web SDK configuration" → "Web client
    // ID". Voir env.dev.example / env.prod.example et README, section
    // "Phase 3".
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
    this.configured = true;
  }

  async signIn(): Promise<{ idToken: string } | null> {
    const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = this.load();
    this.ensureConfigured(GoogleSignin);
    try {
      // No-op sur iOS (toujours résolu à `true`) ; recommandé par la doc de
      // la lib juste avant `signIn()` sur Android, pour un message d'erreur
      // clair si Google Play Services est absent/obsolète plutôt qu'un échec
      // silencieux du flux de connexion.
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return null; // annulé par l'utilisateur, pas une erreur

      const { idToken } = response.data;
      if (!idToken) {
        // Arrive si `webClientId` est absent/mal configuré : Google renvoie
        // alors une connexion réussie mais sans idToken exploitable.
        throw new Error(
          'Google Sign-In : idToken manquant dans la réponse (vérifie EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).',
        );
      }
      return { idToken };
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            throw new Error('Une connexion Google est déjà en cours.');
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new Error("Google Play Services n'est pas disponible ou à jour sur cet appareil.");
          default:
            throw error;
        }
      }
      throw error;
    }
  }

  async signOut(): Promise<void> {
    const { GoogleSignin } = this.load();
    await GoogleSignin.signOut();
  }
}
