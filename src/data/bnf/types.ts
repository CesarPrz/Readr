/**
 * Champ Dublin Core utile extrait du XML SRU de la BnF — pas de format JSON
 * côté BnF, donc pas de type "brut fidèle à l'API" ici comme pour les autres
 * sources : `xml.ts` extrait directement ces champs par expressions
 * régulières. Non exposé hors de ce dossier, comme les autres types raw.
 */
export type BnfRecord = {
  title?: string;
  creators: string[]; // "Nom, Prénom (dates). Rôle" brut, une entrée par <dc:creator>
  language?: string; // ISO 639-2/B, ex. "fre"
};
