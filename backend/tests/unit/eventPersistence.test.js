const { describe, it } = require('node:test');
const assert = require('node:assert');
const { resolveDbModule } = require('../../services/eventPersistence');

describe('EventPersistence Module Resolution', () => {
  it('should preserve valid database ENUM modules', () => {
    assert.strictEqual(resolveDbModule('intrusion', 'any'), 'intrusion');
    assert.strictEqual(resolveDbModule('loitering', 'any'), 'loitering');
    assert.strictEqual(resolveDbModule('vehicle', 'any'), 'vehicle');
    assert.strictEqual(resolveDbModule('facial', 'any'), 'facial');
    assert.strictEqual(resolveDbModule('object', 'any'), 'object');
    assert.strictEqual(resolveDbModule('crowd', 'any'), 'crowd');
  });

  it('should map source_modules to valid DB ENUM modules when module is missing or invalid', () => {
    assert.strictEqual(resolveDbModule(null, 'anpr'), 'vehicle');
    assert.strictEqual(resolveDbModule(null, 'velocity'), 'vehicle');
    assert.strictEqual(resolveDbModule(null, 'misplacement'), 'object');
    assert.strictEqual(resolveDbModule(null, 'threat'), 'loitering');
    assert.strictEqual(resolveDbModule(null, 'entry'), 'intrusion');
    assert.strictEqual(resolveDbModule('invalid_mod', 'unknown'), 'object');
  });
});
