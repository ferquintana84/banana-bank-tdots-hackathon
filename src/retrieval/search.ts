import { appDb } from '../db';
import { config, referenceDate } from '../config';
import { embedTexts } from './embeddings';
import { allChunks } from './store';
import { documents, readDocument } from '../ingestion/pipeline';
import type { DocumentRecord, SearchResult } from '../types';
// In force on a date: it started on or before it and had not ended before it.
export function inForce(doc: Pick<DocumentRecord, 'validFrom' | 'validTo'>, on = referenceDate) {
  return doc.validFrom <= on && (!doc.validTo || doc.validTo >= on);
}
export async function searchDocuments(
  query: string,
  role = 'customer',
  limit = 5,
): Promise<SearchResult[]> {
  const meta = appDb().prepare('SELECT value FROM meta WHERE key=?').get('index-model') as
    { value: string } | undefined;
  if (!meta) throw new Error('No document index. Run npm run setup or npm run ingest.');
  if (meta.value !== config.embeddingModel)
    throw new Error('The model does not match the index. Re-ingest the documents.');
  const [queryVector] = await embedTexts([query]);
  // The manifest is the source of truth for version and validity: most chunks in the
  // index carry neither. A chunk whose document is unknown cannot be shown as current.
  const manifest = new Map(documents().map((d) => [d.id, d]));
  return allChunks()
    .filter((c) => role === 'operator' || c.audience === 'public')
    .filter((c) => {
      const doc = manifest.get(c.documentId);
      return !!doc && inForce(doc);
    })
    .map(({ vector, ...c }) => {
      if (vector!.length !== queryVector.length)
        throw new Error('Incompatible embedding dimensions.');
      const score = vector!.reduce((sum, v, i) => sum + v * queryVector[i], 0);
      const doc = manifest.get(c.documentId)!;
      return {
        ...c,
        title: doc.title,
        version: doc.version,
        validFrom: doc.validFrom,
        validTo: doc.validTo,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
export type AnswerSource = {
  documentId: string;
  title: string | null;
  version: number | null;
  validFrom: string | null;
  validTo: string | null;
  text: string;
};
// What the model reads: each retrieved document once, in full. A 650-character chunk
// finds the document; it is not a reliable unit to answer from.
export function sourcesForAnswer(results: SearchResult[]): AnswerSource[] {
  const manifest = new Map(documents().map((d) => [d.id, d]));
  const seen = new Set<string>();
  return results.flatMap((r) => {
    const doc = manifest.get(r.documentId);
    if (!doc || seen.has(doc.id)) return [];
    seen.add(doc.id);
    return [
      {
        documentId: doc.id,
        title: doc.title,
        version: doc.version,
        validFrom: doc.validFrom,
        validTo: doc.validTo,
        text: readDocument(doc),
      },
    ];
  });
}
