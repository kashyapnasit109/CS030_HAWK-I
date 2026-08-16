const db = require('../config/db');
const mlService = require('./mlService');
const descriptionService = require('./descriptionService');

/**
 * Valid database ENUM values for detection_events.module
 */
const VALID_DB_MODULES = ['intrusion', 'loitering', 'vehicle', 'facial', 'object', 'crowd'];

/**
 * Maps source_module or event_type to a valid database ENUM module.
 */
function resolveDbModule(module, source_module) {
  if (module && VALID_DB_MODULES.includes(module)) {
    return module;
  }
  const map = {
    anpr: 'vehicle',
    velocity: 'vehicle',
    misplacement: 'object',
    threat: 'loitering',
    entry: 'intrusion'
  };
  return map[source_module] || 'object';
}

/**
 * Central event persistence service.
 * Inserts canonical detection event, manages alerts, generates NL description,
 * indexes vector embeddings for semantic search, and updates camera health.
 */
async function persistDetectionEvent(eventData) {
  const {
    camera_id = 1,
    source_module = 'anpr',
    event_type = 'detection',
    module,
    object_type = 'unknown',
    confidence = 1.0,
    bounding_box = null,
    metadata = {},
    description: inputDescription,
    backdate_timestamp,
    severity,
    alert_type,
    processing_fps = null
  } = eventData;

  const dbModuleEnum = resolveDbModule(module, source_module);

  // 1. Insert into detection_events
  let timestampClause = 'NOW()';
  let queryArgs = [];
  if (backdate_timestamp) {
    timestampClause = '?';
    queryArgs.push(backdate_timestamp);
  }

  let eventId = null;
  let hasExtendedColumns = true;

  try {
    // Attempt insert with extended Week 2 schema
    const [result] = await db.query(`
      INSERT INTO detection_events 
      (camera_id, source_module, event_type, module, object_type, confidence, bounding_box, detected_at, metadata, description, processing_fps)
      VALUES (?, ?, ?, ?, ?, ?, ?, ${timestampClause}, ?, ?, ?)
    `, [
      camera_id,
      source_module,
      event_type,
      dbModuleEnum,
      object_type,
      confidence,
      bounding_box ? JSON.stringify(bounding_box) : null,
      ...queryArgs,
      typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
      inputDescription || null,
      processing_fps
    ]);
    eventId = result.insertId;
  } catch (err) {
    // Fallback to legacy schema columns if table hasn't been migrated yet
    console.warn(`[EventPersistence Warning] Extended insert failed (${err.message}). Attempting legacy schema insert.`);
    hasExtendedColumns = false;

    const [result] = await db.query(`
      INSERT INTO detection_events 
      (camera_id, module, object_type, confidence, bounding_box, detected_at, metadata)
      VALUES (?, ?, ?, ?, ?, ${timestampClause}, ?)
    `, [
      camera_id,
      dbModuleEnum,
      object_type,
      confidence,
      bounding_box ? JSON.stringify(bounding_box) : null,
      ...queryArgs,
      typeof metadata === 'string' ? metadata : JSON.stringify(metadata)
    ]);
    eventId = result.insertId;
  }

  // 2. Alert generation if severity is specified
  let alertId = null;
  if (severity && alert_type) {
    try {
      const [alertResult] = await db.query(`
        INSERT INTO alerts (event_id, alert_type, severity, status)
        VALUES (?, ?, ?, 'open')
      `, [eventId, alert_type, severity]);
      alertId = alertResult.insertId;
    } catch (alertErr) {
      console.error(`[EventPersistence] Failed to create alert for event #${eventId}:`, alertErr.message);
    }
  }

  // 3. Natural Language Description Generation & Embedding Indexing
  let descriptionText = inputDescription;
  let embeddingVector = [];

  try {
    const [camRows] = await db.query('SELECT name, zone_type FROM cameras WHERE camera_id = ?', [camera_id]);
    const camName = camRows.length > 0 ? camRows[0].name : `CAM-${camera_id}`;
    const zoneType = camRows.length > 0 ? camRows[0].zone_type : 'indoor';
    const eventTime = backdate_timestamp || new Date().toISOString();

    if (!descriptionText) {
      const metaObj = typeof metadata === 'string' ? JSON.parse(metadata) : (metadata || {});
      descriptionText = descriptionService.generateDescription(camName, zoneType, eventTime, dbModuleEnum, object_type, metaObj);
      
      // Update inline description in detection_events if extended columns exist
      if (hasExtendedColumns) {
        await db.query('UPDATE detection_events SET description = ? WHERE event_id = ?', [descriptionText, eventId]).catch(() => {});
      }
    }

    // Call ML service to generate vector embedding
    const embedRes = await mlService.callEmbed(descriptionText);
    if (embedRes && embedRes.embedding) {
      embeddingVector = embedRes.embedding;
      await db.query(`
        INSERT INTO event_embeddings (event_id, description_text, embedding_vector)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE description_text = VALUES(description_text), embedding_vector = VALUES(embedding_vector)
      `, [eventId, descriptionText, JSON.stringify(embeddingVector)]);
    }
  } catch (embErr) {
    console.error(`[EventPersistence] Non-fatal embedding generation error for event #${eventId}:`, embErr.message);
  }

  // 4. Update camera health status and last_seen
  try {
    await db.query('UPDATE cameras SET last_seen = NOW(), status = "online" WHERE camera_id = ?', [camera_id]);
    await db.query('INSERT INTO camera_health_logs (camera_id, status, checked_at) VALUES (?, "online", NOW())', [camera_id]);
  } catch (camErr) {
    // Non-fatal
  }

  return {
    success: true,
    event_id: eventId,
    alert_id: alertId,
    description: descriptionText,
    severity,
    embedding_indexed: embeddingVector.length > 0
  };
}

module.exports = {
  persistDetectionEvent,
  resolveDbModule
};
