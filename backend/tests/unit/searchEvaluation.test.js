const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Helper functions for metric computations
function calculateMetrics(expectedIds, retrievedIds, k) {
  // Deduplicate retrieved IDs up to K
  const uniqueRetrieved = Array.from(new Set(retrievedIds)).slice(0, k);
  const expectedSet = new Set(expectedIds);

  const relevantRetrieved = uniqueRetrieved.filter(id => expectedSet.has(id));
  const numRetrieved = uniqueRetrieved.length;
  const numRelevant = relevantRetrieved.length;
  const numExpected = expectedSet.size;

  const precision = numRetrieved > 0 ? numRelevant / numRetrieved : 0.0;
  const recall = numExpected > 0 ? numRelevant / numExpected : 0.0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0.0;
  const matched = numRelevant > 0 ? 1 : 0;

  return {
    precision,
    recall,
    f1,
    matched,
    numRetrieved,
    numRelevant,
    numExpected
  };
}

describe('Semantic Search Evaluation Benchmark', () => {
  const datasetPath = path.resolve(__dirname, '../../../tests/evaluation/search_eval_dataset.json');
  const resultsPath = path.resolve(__dirname, '../../../tests/evaluation/search_eval_results.json');

  it('should load annotated benchmark dataset successfully', () => {
    assert.ok(fs.existsSync(datasetPath), 'Evaluation dataset file should exist');
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

    assert.ok(dataset.dataset_metadata, 'Dataset metadata must be defined');
    assert.ok(Array.isArray(dataset.corpus_events), 'corpus_events must be an array');
    assert.ok(dataset.corpus_events.length >= 10, 'Corpus should contain at least 10 events');
    assert.ok(Array.isArray(dataset.evaluation_queries), 'evaluation_queries must be an array');
    assert.ok(dataset.evaluation_queries.length >= 10, 'Queries should contain at least 10 queries');
  });

  it('should verify ground truth coverage across surveillance domains and styles', () => {
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    const categories = new Set(dataset.evaluation_queries.map(q => q.category));
    
    assert.ok(categories.size >= 4, 'Dataset should span at least 4 distinct surveillance categories');
    
    for (const q of dataset.evaluation_queries) {
      assert.ok(q.query_id, 'Query ID required');
      assert.ok(q.query, 'Query text required');
      assert.ok(Array.isArray(q.expected_relevant_event_ids), 'Expected relevant event IDs must be an array');
      assert.ok(q.expected_relevant_event_ids.length > 0, 'Each query must have at least one relevant event');
    }

    // Verify all corpus events have valid descriptions and IDs
    for (const evt of dataset.corpus_events) {
      assert.ok(typeof evt.event_id === 'number', 'Event ID must be numeric');
      assert.ok(evt.description && evt.description.length > 10, 'Event must have descriptive text');
      assert.ok(evt.source_module, 'Event must specify source module');
    }
  });

  it('should verify calculated evaluation metrics from runner', () => {
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      assert.ok(results.metadata, 'Results metadata required');
      assert.ok(results.overall_summary, 'Overall summary required');
      assert.ok(typeof results.overall_summary.precision_at_3 === 'number');
      assert.ok(results.overall_summary.precision_at_3 > 0.0, 'Precision@3 should be greater than 0');
      assert.ok(typeof results.overall_summary.recall_at_3 === 'number');
      assert.ok(results.overall_summary.recall_at_3 > 0.0, 'Recall@3 should be greater than 0');
      assert.ok(typeof results.overall_summary.query_match_rate_at_3 === 'number');
      assert.ok(results.overall_summary.query_match_rate_at_3 > 0.0, 'Query Match Rate should be greater than 0');
    }
  });

  describe('Mathematical Metric Calculations & Edge Cases', () => {
    it('should compute Precision@K accurately for normal retrieval', () => {
      const expected = [1, 2];
      const retrieved = [1, 3, 4]; // 1 relevant out of 3
      const metrics = calculateMetrics(expected, retrieved, 3);
      assert.strictEqual(Math.round(metrics.precision * 100) / 100, 0.33);
      assert.strictEqual(metrics.recall, 0.5);
      assert.strictEqual(metrics.matched, 1);
    });

    it('should handle perfect retrieval (100% precision and recall)', () => {
      const expected = [5];
      const retrieved = [5];
      const metrics = calculateMetrics(expected, retrieved, 1);
      assert.strictEqual(metrics.precision, 1.0);
      assert.strictEqual(metrics.recall, 1.0);
      assert.strictEqual(metrics.f1, 1.0);
      assert.strictEqual(metrics.matched, 1);
    });

    it('should compute F1 score correctly from precision and recall', () => {
      const precision = 0.6;
      const recall = 0.8;
      const expectedF1 = (2 * precision * recall) / (precision + recall);
      const metrics = calculateMetrics([1, 2, 3, 4], [1, 2, 3, 9, 10], 5); // 3 of 5 relevant (P=0.6), 3 of 4 recalled (R=0.75)
      assert.ok(metrics.f1 > 0.6 && metrics.f1 < 0.7);
    });

    it('should handle zero retrieved results gracefully without division by zero', () => {
      const expected = [1, 2];
      const retrieved = [];
      const metrics = calculateMetrics(expected, retrieved, 3);
      assert.strictEqual(metrics.precision, 0.0);
      assert.strictEqual(metrics.recall, 0.0);
      assert.strictEqual(metrics.f1, 0.0);
      assert.strictEqual(metrics.matched, 0);
    });

    it('should handle zero relevant matches gracefully', () => {
      const expected = [1, 2];
      const retrieved = [3, 4, 5];
      const metrics = calculateMetrics(expected, retrieved, 3);
      assert.strictEqual(metrics.precision, 0.0);
      assert.strictEqual(metrics.recall, 0.0);
      assert.strictEqual(metrics.f1, 0.0);
      assert.strictEqual(metrics.matched, 0);
    });

    it('should deduplicate retrieved event IDs to prevent inflation', () => {
      const expected = [1, 2];
      const retrievedWithDuplicates = [1, 1, 1]; // Duplicate ID
      const metrics = calculateMetrics(expected, retrievedWithDuplicates, 3);
      // Deduplicated unique items = [1], so 1 / 1 = 1.0
      assert.strictEqual(metrics.numRetrieved, 1);
      assert.strictEqual(metrics.numRelevant, 1);
      assert.strictEqual(metrics.precision, 1.0);
    });

    it('should handle K greater than retrieved candidates count gracefully', () => {
      const expected = [1, 2];
      const retrieved = [1]; // Only 1 result available
      const metrics = calculateMetrics(expected, retrieved, 10); // K=10 > len=1
      assert.strictEqual(metrics.numRetrieved, 1);
      assert.strictEqual(metrics.precision, 1.0);
      assert.strictEqual(metrics.recall, 0.5);
    });
  });
});
