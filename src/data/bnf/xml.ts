import type { BnfRecord } from './types';

const NUMBER_OF_RECORDS_RE = /<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/;
const TITLE_RE = /<dc:title>([\s\S]*?)<\/dc:title>/;
const CREATOR_RE = /<dc:creator>([\s\S]*?)<\/dc:creator>/g;
const LANGUAGE_RE = /<dc:language>([\s\S]*?)<\/dc:language>/;

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Extrait les champs qui nous intéressent du XML Dublin Core (`oai_dc:dc`)
 * renvoyé par l'API SRU de la BnF. Pas de sortie JSON côté BnF (testé :
 * `recordPacking=json` n'a aucun effet), et la structure `oai_dc:dc` est
 * plate (pas d'imbrication) — une extraction par regex reste plus simple
 * qu'une dépendance de parsing XML pour un usage aussi ciblé.
 */
export function parseBnfDublinCore(xml: string): BnfRecord | undefined {
  const countMatch = xml.match(NUMBER_OF_RECORDS_RE);
  if (!countMatch || Number(countMatch[1]) === 0) return undefined;

  const titleMatch = xml.match(TITLE_RE);
  if (!titleMatch) return undefined;

  const creators = Array.from(xml.matchAll(CREATOR_RE)).map((m) => decodeXmlEntities(m[1]));
  const languageMatch = xml.match(LANGUAGE_RE);

  return {
    title: decodeXmlEntities(titleMatch[1]),
    creators,
    language: languageMatch ? decodeXmlEntities(languageMatch[1]) : undefined,
  };
}
