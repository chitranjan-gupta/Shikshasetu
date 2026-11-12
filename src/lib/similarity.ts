/**
 * Lightweight, zero-dependency token similarity matcher using character n-grams and token overlap.
 * Provides fuzzy semantic-like matching in pure JavaScript with zero network overhead, zero cost, and sub-millisecond execution.
 */

/** Normalize and tokenize string into unique words and 3-grams */
export function tokenize(str: string): { words: Set<string>; trigrams: Set<string> } {
  const clean = str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
  const words = new Set(clean.split(/\s+/).filter((w) => w.length > 1));

  const trigrams = new Set<string>();
  const padded = `  ${clean}  `;
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }
  return { words, trigrams };
}

/** Calculate Sorensen-Dice coefficient between two trigram sets */
export function diceCoefficient(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let matches = 0;
  for (const item of setA) {
    if (setB.has(item)) matches++;
  }
  return (2 * matches) / (setA.size + setB.size);
}

/** Word-level Jaccard similarity */
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Compute similarity score between two texts [0.0 - 1.0].
 * Combines exact word overlap, partial stem overlap, and character trigram fuzzy matching.
 */
export function textSimilarity(a: string, b: string): number {
  const normA = a.trim().toLowerCase();
  const normB = b.trim().toLowerCase();

  // Exact match
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) {
    const ratio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length);
    if (ratio > 0.4) return 0.85 + 0.15 * ratio;
  }

  const tokA = tokenize(normA);
  const tokB = tokenize(normB);

  // Check shared significant keywords (e.g. "sponsorship", "visa", "salary", "experience", "gender")
  let sharedKeywordCount = 0;
  for (const word of tokA.words) {
    if (word.length >= 4 && tokB.words.has(word)) {
      sharedKeywordCount++;
    }
  }

  const wordScore = jaccardSimilarity(tokA.words, tokB.words);
  const trigramScore = diceCoefficient(tokA.trigrams, tokB.trigrams);

  let combined = 0.5 * wordScore + 0.5 * trigramScore;
  if (sharedKeywordCount >= 2) {
    combined = Math.max(combined, 0.7);
  } else if (sharedKeywordCount === 1 && tokA.words.size <= 4) {
    combined = Math.max(combined, 0.55);
  }

  return combined;
}

/** Find the best matching key from candidates that exceeds the threshold */
export function findBestSemanticMatch(
  query: string,
  candidates: string[],
  threshold = 0.5
): { match: string; score: number } | null {
  let best: { match: string; score: number } | null = null;

  for (const candidate of candidates) {
    const score = textSimilarity(query, candidate);
    if (score >= threshold && (!best || score > best.score)) {
      best = { match: candidate, score };
    }
  }

  return best;
}
