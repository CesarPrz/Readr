import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import type { UserSearchRepository, UserSummary } from '../../domain/repositories/UserSearchRepository';
import { firestoreDb } from './firebaseApp';

/**
 * Recherche par préfixe sur `users.usernameSearch` — voir
 * `UserSearchRepository` pour le contrat et `utils/userSearch.ts` pour la
 * normalisation. Technique classique Firestore pour un "commence par" :
 * `>= préfixe` ET `< préfixe + ''` (un caractère Unicode très élevé,
 * qui borne tout ce qui commence par le préfixe). Un seul champ filtré par
 * une plage : l'index automatique mono-champ de Firestore suffit, aucun
 * index composite à créer. Couvert par la règle de lecture publique déjà en
 * place sur `users/{uid}` (`allow read: if request.auth != null`, valable
 * pour une requête de collection comme pour un `get`).
 */
export class FirestoreUserSearchRepository implements UserSearchRepository {
  async searchByUsernamePrefix(normalizedPrefix: string, max: number): Promise<UserSummary[]> {
    const snapshot = await getDocs(
      query(
        collection(firestoreDb, 'users'),
        where('usernameSearch', '>=', normalizedPrefix),
        where('usernameSearch', '<', `${normalizedPrefix}`),
        limit(max),
      ),
    );

    return snapshot.docs
      .map((d): UserSummary => {
        const data = d.data();
        return {
          uid: d.id,
          username: typeof data.username === 'string' ? data.username : '',
          photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : undefined,
          bio: typeof data.bio === 'string' ? data.bio : undefined,
        };
      })
      .filter((u) => u.username !== '');
  }
}
