// Display-only labels for Open Library's language codes — purely a formatting
// concern, pas une règle métier. Partagé entre tous les écrans qui affichent
// une langue (fiche livre, regroupement par langue des résultats de
// recherche). Falls back to the raw code.
const LANGUAGE_LABELS: Record<string, string> = {
  eng: 'Anglais',
  fre: 'Français',
  fra: 'Français',
  spa: 'Espagnol',
  ger: 'Allemand',
  deu: 'Allemand',
  ita: 'Italien',
  por: 'Portugais',
  dut: 'Néerlandais',
  nld: 'Néerlandais',
  jpn: 'Japonais',
  chi: 'Chinois',
  zho: 'Chinois',
  rus: 'Russe',
  ara: 'Arabe',
  kor: 'Coréen',
};

export function languageLabel(code: string): string {
  return LANGUAGE_LABELS[code] ?? code.toUpperCase();
}
