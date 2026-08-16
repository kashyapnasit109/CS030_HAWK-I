const db = require('../config/db');
const { persistDetectionEvent } = require('../services/eventPersistence');

/**
 * GET /api/events
 * Fetch list of detection events with optional module/camera/source_module filters and pagination.
 */
exports.getEvents = async (req, res) => {
  try {
    const { module, camera_id, source_module, limit = 100, offset = 0 } = req.query;
    let query = `
      SELECT 
        e.*,
        c.name AS camera_name,
        c.zone_type,
        c.location AS camera_location,
        a.alert_id,
        a.severity AS alert_severity,
        a.status AS alert_status
      FROM detection_events e
      LEFT JOIN cameras c ON e.camera_id = c.camera_id
      LEFT JOIN alerts a ON e.event_id = a.event_id
      WHERE 1=1
    `;
    let params = [];
    
    if (module) {
      query += ' AND e.module = ?';
      params.push(module);
    }
    if (source_module) {
      query += ' AND e.source_module = ?';
      params.push(source_module);
    }
    if (camera_id) {
      query += ' AND e.camera_id = ?';
      params.push(camera_id);
    }

    query += ' ORDER BY e.detected_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[EventsController] getEvents error:', err);
    res.status(500).json({ error: 'Server error retrieving detection events' });
  }
};

/**
 * GET /api/events/:id
 * Fetch detailed view for a single event by ID.
 */
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT 
        e.*,
        c.name AS camera_name,
        c.zone_type,
        c.location AS camera_location,
        a.alert_id,
        a.alert_type,
        a.severity AS alert_severity,
        a.status AS alert_status,
        emb.description_text AS embedding_description
      FROM detection_events e
      LEFT JOIN cameras c ON e.camera_id = c.camera_id
      LEFT JOIN alerts a ON e.event_id = a.event_id
      LEFT JOIN event_embeddings emb ON e.event_id = emb.event_id
      WHERE e.event_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: `Event with ID ${id} not found` });
    }

    const event = rows[0];
    // Parse JSON fields if they are strings
    if (typeof event.metadata === 'string') {
      try { event.metadata = JSON.parse(event.metadata); } catch (_) {}
    }
    if (typeof event.bounding_box === 'string') {
      try { event.bounding_box = JSON.parse(event.bounding_box); } catch (_) {}
    }

    res.json(event);
  } catch (err) {
    console.error('[EventsController] getEventById error:', err);
    res.status(500).json({ error: 'Server error retrieving event details' });
  }
};

/**
 * POST /api/events
 * Create and persist a canonical detection event through the shared pipeline.
 */
exports.createEvent = async (req, res) => {
  try {
    const {
      camera_id,
      source_module,
      event_type,
      module,
      object_type,
      confidence,
      bounding_box,
      metadata,
      description,
      severity,
      alert_type,
      backdate_timestamp,
      processing_fps
    } = req.body;

    if (!camera_id) {
      return res.status(400).json({ error: 'Missing required field: camera_id' });
    }

    const result = await persistDetectionEvent({
      camera_id: parseInt(camera_id, 10),
      source_module: source_module || 'anpr',
      event_type: event_type || 'custom_event',
      module,
      object_type: object_type || 'unknown',
      confidence: confidence !== undefined ? parseFloat(confidence) : 1.0,
      bounding_box,
      metadata: metadata || {},
      description,
      severity,
      alert_type,
      backdate_timestamp,
      processing_fps: processing_fps ? parseFloat(processing_fps) : null
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('[EventsController] createEvent error:', err);
    res.status(500).json({ error: `Failed to create detection event: ${err.message}` });
  }
};
