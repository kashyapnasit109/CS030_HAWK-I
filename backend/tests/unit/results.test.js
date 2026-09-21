const { describe, it } = require('node:test');
const assert = require('node:assert');
const resultsController = require('../../controllers/results');

describe('Results Controller Unit Tests', () => {
  it('should return detection results with success status', async () => {
    const req = {
      query: { page: 1, limit: 10, module: 'all', severity: 'all' }
    };
    let jsonResult = null;
    const res = {
      json: (data) => {
        jsonResult = data;
        return data;
      },
      status: () => res
    };

    await resultsController.getResults(req, res);
    assert.ok(jsonResult, 'Response object should be defined');
    assert.strictEqual(jsonResult.success, true);
    assert.ok(Array.isArray(jsonResult.results), 'results should be an array');
    assert.ok(jsonResult.results.length > 0, 'results should contain items');
  });

  it('should filter results by source_module accurately', async () => {
    const req = {
      query: { page: 1, limit: 10, module: 'velocity', severity: 'all' }
    };
    let jsonResult = null;
    const res = {
      json: (data) => {
        jsonResult = data;
        return data;
      },
      status: () => res
    };

    await resultsController.getResults(req, res);
    assert.ok(jsonResult);
    assert.strictEqual(jsonResult.success, true);
    for (const r of jsonResult.results) {
      assert.ok(
        r.source_module === 'velocity' || r.module === 'velocity' || r.module === 'vehicle',
        `Result should match velocity filter, got ${r.source_module || r.module}`
      );
    }
  });

  it('should return summary counts and KPIs', async () => {
    const req = {};
    let jsonResult = null;
    const res = {
      json: (data) => {
        jsonResult = data;
        return data;
      },
      status: () => res
    };

    await resultsController.getResultsSummary(req, res);
    assert.ok(jsonResult);
    assert.strictEqual(jsonResult.success, true);
    assert.ok(jsonResult.summary, 'summary object should exist');
    assert.ok(typeof jsonResult.summary.total_results === 'number');
    assert.ok(jsonResult.summary.by_module);
    assert.ok(jsonResult.summary.by_severity);
  });

  it('should return single result detail by ID', async () => {
    const req = { params: { id: '101' } };
    let jsonResult = null;
    const res = {
      json: (data) => {
        jsonResult = data;
        return data;
      },
      status: () => res
    };

    await resultsController.getResultById(req, res);
    assert.ok(jsonResult);
    assert.strictEqual(jsonResult.success, true);
    assert.ok(jsonResult.result);
    assert.strictEqual(String(jsonResult.result.event_id), '101');
  });
});
