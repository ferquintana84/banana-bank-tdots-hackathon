import { inForce, type AnswerSource } from '../retrieval/search';
// D13: a citation is checked by the server, not trusted from the model.
export type Movement = {
  id: string;
  accountId: string;
  amountCents: number;
  description: string;
  createdAt: string;
};
export type OwnAccount = { id: string; label: string; balanceCents: number };
// What this turn actually put on the table: documents retrieved, bank data returned by tools.
export type Facts = {
  documents: Map<string, AnswerSource>;
  accounts: Map<string, OwnAccount>;
  movements: Map<string, Movement>;
  // Every euro amount, in cents, that a source, a tool result or the conversation contains.
  amounts: Set<number>;
};
export type RawEvidence = {
  answer: string;
  verified: {
    claim: string;
    sources: { kind: 'document' | 'account' | 'movement'; id: string }[];
  }[];
  notVerified: { claim: string; reason: string }[];
  nextStep: string | null;
};
export type Source =
  | {
      kind: 'document';
      id: string;
      title: string | null;
      version: number | null;
      validFrom: string | null;
      validTo: string | null;
    }
  | { kind: 'account'; id: string; label: string }
  | {
      kind: 'movement';
      id: string;
      accountId: string;
      description: string;
      amountCents: number;
      createdAt: string;
    };
export type Evidence = {
  verified: { claim: string; sources: Source[] }[];
  notVerified: { claim: string; reason: string }[];
  nextStep: string | null;
  downgraded: number;
};
export const newFacts = (): Facts => ({
  documents: new Map(),
  accounts: new Map(),
  movements: new Map(),
  amounts: new Set(),
});
const AMOUNT = /(?:EUR|€)\s?(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s?(?:EUR\b|euros?\b|€)/gi;
export const amountsIn = (text: string) =>
  [...text.matchAll(AMOUNT)].map((m) =>
    Math.round(parseFloat((m[1] ?? m[2]).replace(/,/g, '')) * 100),
  );
// Gathers amounts from text and from any numeric field named like amountCents or balanceCents.
export function collectAmounts(value: unknown, into: Set<number>) {
  if (typeof value === 'string') for (const a of amountsIn(value)) into.add(a);
  else if (Array.isArray(value)) for (const item of value) collectAmounts(item, into);
  else if (value && typeof value === 'object')
    for (const [key, item] of Object.entries(value))
      if (typeof item === 'number' && /Cents$/.test(key)) into.add(Math.abs(item));
      else collectAmounts(item, into);
}
function resolve(
  ref: RawEvidence['verified'][number]['sources'][number],
  facts: Facts,
): { source: Source; amounts: number[] } | null {
  if (ref.kind === 'document') {
    const d = facts.documents.get(ref.id);
    if (!d || !d.validFrom || !inForce({ validFrom: d.validFrom, validTo: d.validTo })) return null;
    return {
      source: {
        kind: 'document',
        id: d.documentId,
        title: d.title,
        version: d.version,
        validFrom: d.validFrom,
        validTo: d.validTo,
      },
      amounts: amountsIn(d.text),
    };
  }
  if (ref.kind === 'account') {
    const a = facts.accounts.get(ref.id);
    return a
      ? { source: { kind: 'account', id: a.id, label: a.label }, amounts: [a.balanceCents] }
      : null;
  }
  const m = facts.movements.get(ref.id);
  return m
    ? {
        source: {
          kind: 'movement',
          id: m.id,
          accountId: m.accountId,
          description: m.description,
          amountCents: m.amountCents,
          createdAt: m.createdAt,
        },
        amounts: [Math.abs(m.amountCents)],
      }
    : null;
}
export function validateEvidence(raw: RawEvidence, facts: Facts): Evidence {
  const verified: Evidence['verified'] = [],
    notVerified = [...raw.notVerified];
  let downgraded = 0;
  for (const item of raw.verified) {
    const resolved = item.sources.flatMap((s) => resolve(s, facts) ?? []);
    const backed = new Set(resolved.flatMap((r) => r.amounts));
    const reason = !resolved.length
      ? 'No valid source supports this statement.'
      : amountsIn(item.claim).some((a) => !backed.has(a))
        ? 'An amount in this statement does not appear in its source.'
        : null;
    if (reason) {
      downgraded++;
      notVerified.push({ claim: item.claim, reason });
    } else
      verified.push({
        claim: item.claim,
        sources: [
          ...new Map(resolved.map((r) => [`${r.source.kind}:${r.source.id}`, r.source])).values(),
        ],
      });
  }
  return { verified, notVerified, nextStep: raw.nextStep?.trim() || null, downgraded };
}
// The sentences the customer reads may only carry amounts that a source, a tool result or
// the conversation contains. Otherwise the answer is rebuilt from the validated evidence:
// a drier answer is better than an unbacked figure.
export function answerText(raw: RawEvidence, evidence: Evidence, facts: Facts) {
  if (!amountsIn(raw.answer).some((a) => !facts.amounts.has(a))) return raw.answer;
  return (
    [
      evidence.verified.length
        ? `What we could verify: ${evidence.verified.map((v) => v.claim).join(' ')}`
        : '',
      evidence.notVerified.length
        ? `What we could not verify: ${evidence.notVerified.map((n) => n.claim).join(' ')}`
        : '',
      evidence.nextStep ? `Next step: ${evidence.nextStep}` : '',
    ]
      .filter(Boolean)
      .join('\n') || 'We could not verify an answer to this. Please ask for a person to review it.'
  );
}
