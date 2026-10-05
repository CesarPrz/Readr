/**
 * Rejette avec `message` après `ms` millisecondes si `promise` ne s'est pas
 * encore réglée. Utilisé pour les rares appels réseau attendus au premier
 * plan (pas les synchronisations best-effort habituelles de `syncLibraryEntry`
 * etc., qui restent volontairement sans timeout et avalent leurs erreurs en
 * tâche de fond) : sans lui, un Firestore injoignable ou mal configuré
 * laisse l'utilisateur bloqué sur un spinner qui ne se débloque jamais, sans
 * le moindre message — cas rencontré avec `linkGoogleAccount` quand la
 * liaison bascule vers un compte existant (voir le plan Firebase, doc Claude
 * du projet, section "Bascule vers un compte existant").
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
