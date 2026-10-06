/**
 * Reconnaissance de genres usuels (Horreur, Policier, Romance, Fantasy...)
 * à partir des sujets Open Library — utilisé par `getRecommendations`
 * (groupe "genre", voir ce fichier) pour la row "D'autres livres du genre
 * X" de l'écran Découvrir.
 *
 * Pourquoi ce fichier existe (06/10/2026 → 07/10/2026, demande explicite du
 * porteur du projet après avoir vu "D'autres classiques du genre 'Holes'"
 * s'afficher sur son écran) : Open Library ne propose aucune taxonomie de
 * genres propre, seulement des `subjects` en texte libre qui mélangent
 * genres, thèmes, lieux, personnages, prix littéraires, et parfois des
 * éléments sans rapport avec un genre — y compris, dans ce cas précis, le
 * titre d'une autre œuvre ("Holes", le roman de Louis Sachar, catalogué
 * comme sujet sur un des livres de la bibliothèque). L'ancien comportement
 * (`subjects[0]` affiché tel quel, voir l'historique de `getRecommendations`)
 * pouvait donc afficher littéralement n'importe quoi comme "genre".
 *
 * Nouvelle approche : chaque sujet Open Library d'un livre est comparé à une
 * liste fermée de genres usuels ci-dessous (`GENRE_DEFINITIONS`) ; le
 * premier sujet qui correspond à un genre connu est utilisé, dans l'ordre où
 * Open Library les renvoie (en pratique souvent du plus général/pertinent au
 * plus spécifique). Si aucun sujet ne correspond à un genre connu, aucun
 * groupe "genre" n'est généré pour ce livre — mieux vaut l'absence de row
 * que d'en remontrer une avec un libellé qui n'a jamais été un genre.
 *
 * Mots-clés en anglais ET en français : Open Library référence
 * majoritairement en anglais (y compris pour des livres francophones), mais
 * certaines notices (BnF, éditions françaises) utilisent des sujets
 * français — voir `data/bnf/`. Correspondance par sous-chaîne (`includes`),
 * volontairement large plutôt qu'une égalité stricte, pour couvrir les
 * variantes réelles observées côté Open Library (ex. "Detective and mystery
 * stories", "Mystery fiction", "Crime" désignent tous "Policier" pour cet
 * usage).
 */

type GenreDefinition = {
  /** Étiquette affichée à l'utilisateur, en français. */
  label: string;
  /** Sous-chaînes (déjà en minuscules, sans accents) qui identifient ce genre dans un sujet Open Library. */
  keywords: string[];
};

const GENRE_DEFINITIONS: GenreDefinition[] = [
  {
    label: 'Horreur',
    keywords: [
      'horror',
      'ghost stories',
      'supernatural fiction',
      'occult fiction',
      'vampires',
      'zombies',
      'horreur',
      'vampire',
      'fantome',
    ],
  },
  {
    label: 'Policier',
    keywords: [
      'detective and mystery stories',
      'mystery fiction',
      'crime fiction',
      'detective fiction',
      'murder',
      'policier',
      'enquete',
      'meurtre',
    ],
  },
  { label: 'Thriller', keywords: ['thriller', 'suspense fiction', 'suspense'] },
  { label: 'Romance', keywords: ['romance fiction', 'love stories', 'romance', 'amour', 'sentimental'] },
  {
    label: 'Fantasy',
    keywords: ['fantasy fiction', 'fantasy', 'magic', 'wizards', 'dragons', 'sorcellerie', 'fantastique'],
  },
  {
    label: 'Science-fiction',
    keywords: ['science fiction', 'dystopias', 'dystopian fiction', 'space opera', 'science-fiction'],
  },
  {
    label: 'Biographie',
    keywords: ['biography', 'autobiography', 'memoirs', 'biographie', 'autobiographie', 'memoires'],
  },
  { label: 'Historique', keywords: ['historical fiction', 'history', 'historique'] },
  { label: 'Aventure', keywords: ['adventure fiction', 'adventure stories', 'adventure', 'aventure'] },
  {
    label: 'Jeunesse',
    keywords: ["juvenile fiction", "children's stories", 'young adult fiction', 'jeunesse'],
  },
  { label: 'Poésie', keywords: ['poetry', 'poesie'] },
  { label: 'Humour', keywords: ['humor', 'humour', 'comedy'] },
  { label: 'Classiques', keywords: ['classic literature', 'classics'] },
];

/** Minuscule, sans accents — pour des comparaisons robustes aux variantes anglais/français. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Jusqu'à `max` libellés de genre DISTINCTS reconnus dans `subjects`, dans
 * l'ordre où Open Library les renvoie — pour les tags affichés sur les
 * cartes de livres (résultats de recherche et Découvrir). Même table de
 * correspondance que `matchKnownGenre` ; `[]` si rien ne correspond.
 */
export function matchKnownGenres(subjects: string[], max = 2): string[] {
  const labels: string[] = [];
  for (const subject of subjects) {
    const normalized = normalize(subject);
    const definition = GENRE_DEFINITIONS.find((def) => def.keywords.some((keyword) => normalized.includes(keyword)));
    if (definition && !labels.includes(definition.label)) {
      labels.push(definition.label);
      if (labels.length >= max) break;
    }
  }
  return labels;
}

export type GenreMatch = {
  /** Étiquette affichée à l'utilisateur (ex. "Policier"). */
  label: string;
  /** Sujet Open Library exact qui a déclenché la correspondance (ex. "Detective and mystery stories") — jamais affiché, utilisé uniquement pour la requête `subject:"..."` côté Open Library. */
  openLibrarySubject: string;
};

/**
 * Cherche, dans l'ordre où Open Library les renvoie, le premier sujet qui
 * correspond à un genre connu (voir `GENRE_DEFINITIONS` ci-dessus).
 * `undefined` si aucun sujet ne correspond.
 */
export function matchKnownGenre(subjects: string[]): GenreMatch | undefined {
  for (const subject of subjects) {
    const normalized = normalize(subject);
    const definition = GENRE_DEFINITIONS.find((def) => def.keywords.some((keyword) => normalized.includes(keyword)));
    if (definition) return { label: definition.label, openLibrarySubject: subject };
  }
  return undefined;
}
