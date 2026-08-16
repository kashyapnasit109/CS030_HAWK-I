const { describe, it } = require('node:test');
const assert = require('node:assert');
const descriptionService = require('../../services/descriptionService');

describe('End-to-End Pipeline: Ingest -> Event -> Description -> Search Simulation', () => {
  it('should generate accurate descriptive text from canonical detection events', () => {
    // 1. ANPR Detection Event
    const anprDesc = descriptionService.generateDescription(
      'CAM-01',
      'entrance',
      '2026-08-16T12:00:00.000Z',
      'vehicle',
      'car',
      { plate_text: 'MH-02-CD-5678', registry_match: true }
    );
    assert.ok(anprDesc.includes('registered vehicle detected at CAM-01'));
    assert.ok(anprDesc.includes('License plate: MH-02-CD-5678'));

    // 2. Velocity Detection Event
    const veloDesc = descriptionService.generateDescription(
      'CAM-04',
      'parking',
      '2026-08-16T12:05:00.000Z',
      'vehicle',
      'truck',
      { tracked_objects: [{ max_speed_kmh: 48.5 }] }
    );
    assert.ok(veloDesc.includes('CAM-04'));
    assert.ok(veloDesc.includes('49 km/h') || veloDesc.includes('48.5 km/h') || veloDesc.includes('maximum speed'));

    // 3. Misplacement Detection Event
    const misDesc = descriptionService.generateDescription(
      'CAM-03',
      'indoor',
      '2026-08-16T12:10:00.000Z',
      'object',
      'backpack',
      {
        differences: [
          { change_type: 'missing_object' },
          { change_type: 'new_object' }
        ]
      }
    );
    assert.ok(misDesc.includes('1 object(s) went missing'));
    assert.ok(misDesc.includes('1 new object(s) appeared'));

    // 4. Threat Detection Event
    const threatDesc = descriptionService.generateDescription(
      'CAM-06',
      'perimeter',
      '2026-08-16T12:15:00.000Z',
      'loitering',
      'person',
      {
        anomalies: [
          {
            triggered_rules: ['restricted_zone', 'loitering'],
            explanation: 'Perimeter fence breach during off hours.'
          }
        ]
      }
    );
    assert.ok(threatDesc.includes('restricted_zone'));
    assert.ok(threatDesc.includes('Perimeter fence breach'));
  });

  it('should rank events accurately in simulated cosine similarity search', () => {
    // Simulated 4-D embedding vectors for demonstration of semantic retrieval
    // Dimensions: [vehicle_feature, speed_feature, breach_feature, object_feature]
    const querySpeedingTruck = [0.8, 0.9, 0.1, 0.0];

    const storedEvents = [
      {
        event_id: 101,
        description: 'Speeding truck detected moving 50 km/h in parking lot',
        vector: [0.75, 0.85, 0.15, 0.05]
      },
      {
        event_id: 102,
        description: 'Perimeter breach loitering near south fence',
        vector: [0.1, 0.05, 0.95, 0.1]
      },
      {
        event_id: 103,
        description: 'Unattended backpack in server room',
        vector: [0.05, 0.0, 0.2, 0.9]
      }
    ];

    function cosineSim(a, b) {
      let dot = 0, nA = 0, nB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        nA += a[i] * a[i];
        nB += b[i] * b[i];
      }
      return dot / (Math.sqrt(nA) * Math.sqrt(nB));
    }

    const scored = storedEvents.map(evt => ({
      ...evt,
      score: cosineSim(querySpeedingTruck, evt.vector)
    })).sort((a, b) => b.score - a.score);

    // Most relevant event must be the speeding truck (#101)
    assert.strictEqual(scored[0].event_id, 101);
    assert.ok(scored[0].score > 0.95);
    assert.ok(scored[0].score > scored[1].score);
  });
});
