const { describe, it } = require('node:test');
const assert = require('node:assert');

// Cosine similarity test implementation
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

describe('Semantic Search Cosine Similarity', () => {
  it('should return 1.0 for identical non-zero vectors', () => {
    const vecA = [0.5, 0.5, 0.5, 0.5];
    const vecB = [0.5, 0.5, 0.5, 0.5];
    const sim = cosineSimilarity(vecA, vecB);
    assert.strictEqual(Math.round(sim * 1000) / 1000, 1.0);
  });

  it('should return 0.0 for orthogonal vectors', () => {
    const vecA = [1.0, 0.0, 0.0];
    const vecB = [0.0, 1.0, 0.0];
    const sim = cosineSimilarity(vecA, vecB);
    assert.strictEqual(sim, 0.0);
  });

  it('should handle zero vectors gracefully without division by zero', () => {
    const vecA = [0.0, 0.0, 0.0];
    const vecB = [1.0, 2.0, 3.0];
    const sim = cosineSimilarity(vecA, vecB);
    assert.strictEqual(sim, 0.0);
  });

  it('should correctly rank vectors by semantic proximity', () => {
    const query = [1.0, 0.8, 0.2];
    const closeVec = [0.95, 0.85, 0.22];
    const farVec = [-0.5, 0.1, 0.9];

    const scoreClose = cosineSimilarity(query, closeVec);
    const scoreFar = cosineSimilarity(query, farVec);

    assert.ok(scoreClose > scoreFar);
    assert.ok(scoreClose > 0.9);
  });
});
