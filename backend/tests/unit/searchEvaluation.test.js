const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

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
    assert.ok(dataset.evaluation_queries.length >= 8, 'Queries should contain at least 8 queries');
  });

  it('should verify ground truth coverage across surveillance domains', () => {
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    const categories = new Set(dataset.evaluation_queries.map(q => q.category));
    
    assert.ok(categories.size >= 4, 'Dataset should span at least 4 distinct surveillance categories');
    
    for (const q of dataset.evaluation_queries) {
      assert.ok(q.query_id, 'Query ID required');
      assert.ok(q.query, 'Query text required');
      assert.ok(Array.isArray(q.expected_relevant_event_ids), 'Expected relevant event IDs must be an array');
      assert.ok(q.expected_relevant_event_ids.length > 0, 'Each query must have at least one relevant event');
    }
  });

  it('should verify calculated evaluation metrics from runner', () => {
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      assert.ok(results.metadata, 'Results metadata required');
      assert.ok(results.aggregate_metrics, 'Aggregate metrics required');
      assert.ok(typeof results.aggregate_metrics.mean_precision === 'number');
      assert.ok(results.aggregate_metrics.mean_precision > 0.0, 'Precision should be greater than 0');
      assert.ok(typeof results.aggregate_metrics.mean_recall === 'number');
      assert.ok(results.aggregate_metrics.mean_recall > 0.0, 'Recall should be greater than 0');
    }
  });
});
