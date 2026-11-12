import { describe, expect, it } from 'vitest';
import { textSimilarity, findBestSemanticMatch } from './similarity';

describe('similarity', () => {
  it('detects exact and substring matches with high confidence', () => {
    expect(textSimilarity('Years of experience', 'years of experience')).toBe(1.0);
    expect(textSimilarity('experience', 'years of experience')).toBeGreaterThan(0.8);
  });

  it('matches semantic variations and reworded career questions', () => {
    const q1 = 'Do you require visa sponsorship now or in the future?';
    const q2 = 'Will you now or in the future require sponsorship for employment visa status?';
    expect(textSimilarity(q1, q2)).toBeGreaterThan(0.6);
  });

  it('finds best matching candidate accurately', () => {
    const candidates = [
      'Full Name',
      'Phone Number',
      'Do you require visa sponsorship?',
      'Highest Level of Education',
    ];
    const match = findBestSemanticMatch('Visa Sponsorship Required', candidates);
    expect(match).not.toBeNull();
    expect(match?.match).toBe('Do you require visa sponsorship?');
  });

  it('rejects unrelated questions below threshold', () => {
    const candidates = ['First Name', 'Last Name', 'Email Address'];
    const match = findBestSemanticMatch('Are you authorized to work in the UK?', candidates);
    expect(match).toBeNull();
  });
});
