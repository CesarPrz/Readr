// Pseudonyme d'affichage pour le profil d'un utilisateur encore anonyme
// (Phase 3 du plan Firebase, doc Claude du projet, "firebase-social-plan") —
// juste du formatage de présentation, comme `languageLabels.ts` : aucune
// règle métier, ne touche jamais `UserProfile.displayName` (qui reste
// exclusivement le vrai nom Google une fois lié, voir `domain/entities/
// UserProfile.ts`). Généré côté client, jamais écrit dans Firebase — un
// utilisateur anonyme n'a pas de vraie identité, ce pseudonyme sert juste à
// rendre l'écran Profil moins vide/impersonnel avant liaison.
//
// Déterministe à partir de l'`uid` : le même utilisateur anonyme voit
// toujours le même pseudonyme d'une session à l'autre (tant qu'il n'a pas
// lié Google), plutôt qu'un nom différent à chaque affichage de l'écran.

const NOUNS = [
  'Lecteur',
  'Lectrice',
  'Bibliophile',
  'Liseur',
  'Liseuse',
  'Explorateur',
  'Exploratrice',
  'Dévoreur de livres',
  'Rat de bibliothèque',
  'Feuilleteur',
  'Conteur',
  'Rêveur de pages',
];

const ADJECTIVES = [
  'Curieux',
  'Curieuse',
  'Nocturne',
  'Discret',
  'Discrète',
  'Passionné',
  'Passionnée',
  'Attentif',
  'Attentive',
  'Vorace',
  'Poétique',
  'Studieux',
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    // `>>> 0` force un entier 32 bits non signé, pour un modulo toujours positif ci-dessous.
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Ex. "Lecteur Nocturne 4821" — stable pour un même `uid`, sans appel réseau ni écriture Firebase. */
export function generateAnonymousPseudonym(uid: string): string {
  const hash = hashString(uid);
  const noun = NOUNS[hash % NOUNS.length];
  const adjective = ADJECTIVES[Math.floor(hash / NOUNS.length) % ADJECTIVES.length];
  const suffix = 1000 + (hash % 9000); // nombre à 4 chiffres, lui aussi stable pour ce uid
  return `${noun} ${adjective} ${suffix}`;
}
