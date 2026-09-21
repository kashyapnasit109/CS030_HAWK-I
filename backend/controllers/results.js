const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// Mock fallback results for offline / demo mode
const MOCK_RESULTS = [
  {
    event_id: 101,
    camera_id: 1,
    camera_name: 'CAM-01 Entrance Gate',
    camera_location: 'North Gate Perimeter',
    zone_type: 'entrance',
    source_module: 'velocity',
    event_type: 'speed_violation',
    module: 'vehicle',
    object_type: 'car',
    confidence: 0.96,
    bounding_box: { x: 180, y: 140, w: 220, h: 140 },
    detected_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    description: 'Vehicle #14 detected traveling at 47.8 km/h exceeding the zone speed limit of 25.0 km/h.',
    metadata: { object_id: 14, max_speed_kmh: 47.8, avg_speed_kmh: 36.2, speed_threshold_kmh: 25.0 },
    severity: 'danger',
    alert_id: 201,
    alert_type: 'speed_violation',
    alert_status: 'open',
    clip_id: 301,
    clip_path: '/media/clips/test_clip_3500.mp4',
    thumbnail_path: '/media/clips/test_clip_3500_thumb.jpg',
    duration_sec: 6,
    file_size_kb: 1450
  },
  {
    event_id: 102,
    camera_id: 2,
    camera_name: 'CAM-02 Main Parking Deck',
    camera_location: 'Zone B Parking',
    zone_type: 'parking',
    source_module: 'anpr',
    event_type: 'plate_recognized',
    module: 'vehicle',
    object_type: 'car',
    confidence: 0.94,
    bounding_box: { x: 220, y: 200, w: 160, h: 90 },
    detected_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    description: 'License plate GJ01AB1234 recognized on white sedan. Vehicle registered to staff database.',
    metadata: { plate_text: 'GJ01AB1234', registry_match: true, vehicle_class: 'car' },
    severity: 'info',
    alert_id: null,
    alert_type: null,
    alert_status: null,
    clip_id: 302,
    clip_path: '/media/clips/test_clip_3500.mp4',
    thumbnail_path: '/media/clips/test_clip_3500_thumb.jpg',
    duration_sec: 5,
    file_size_kb: 1200
  },
  {
    event_id: 103,
    camera_id: 3,
    camera_name: 'CAM-03 Restricted Server Hall',
    camera_location: 'Building B - Level 2',
    zone_type: 'indoor',
    source_module: 'threat',
    event_type: 'threat_detected',
    module: 'loitering',
    object_type: 'person',
    confidence: 0.89,
    bounding_box: { x: 140, y: 110, w: 110, h: 210 },
    detected_at: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
    description: 'Threat anomaly: Person (ID #4) lingered in restricted server corridor for 42.0 seconds exceeding dwell threshold.',
    metadata: { object_id: 4, triggered_rules: ['loitering', 'restricted_zone'], dwell_time_sec: 42.0 },
    severity: 'danger',
    alert_id: 203,
    alert_type: 'loitering',
    alert_status: 'open',
    clip_id: 303,
    clip_path: '/media/clips/test_clip_3500.mp4',
    thumbnail_path: '/media/clips/test_clip_3500_thumb.jpg',
    duration_sec: 7,
    file_size_kb: 1680
  },
  {
    event_id: 104,
    camera_id: 4,
    camera_name: 'CAM-04 Warehouse Loading Bay',
    camera_location: 'Bay 3 Logistics',
    zone_type: 'perimeter',
    source_module: 'misplacement',
    event_type: 'object_missing_object',
    module: 'object',
    object_type: 'pallet',
    confidence: 0.85,
    bounding_box: { x: 300, y: 160, w: 140, h: 100 },
    detected_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    description: 'Object misplacement: A pallet was removed or went missing from the designated staging zone.',
    metadata: { change_type: 'missing_object', object_type: 'pallet' },
    severity: 'warning',
    alert_id: 204,
    alert_type: 'object_missing',
    alert_status: 'acknowledged',
    clip_id: 304,
    clip_path: '/media/clips/test_clip_3500.mp4',
    thumbnail_path: '/media/clips/test_clip_3500_thumb.jpg',
    duration_sec: 5,
    file_size_kb: 1150
  },
  {
    event_id: 105,
    camera_id: 1,
    camera_name: 'CAM-01 Entrance Gate',
    camera_location: 'North Gate Perimeter',
    zone_type: 'entrance',
    source_module: 'entry',
    event_type: 'unauthorized_entry',
    module: 'intrusion',
    object_type: 'person',
    confidence: 0.92,
    bounding_box: { x: 90, y: 130, w: 80, h: 180 },
    detected_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    description: 'Unauthorized entry flagged: Point-in-polygon intrusion detected across barrier perimeter without access scan.',
    metadata: { zone_id: 1, directional_vector: 'inbound', access_scanned: false },
    severity: 'danger',
    alert_id: 205,
    alert_type: 'unauthorized_entry',
    alert_status: 'resolved',
    clip_id: 305,
    clip_path: '/media/clips/test_clip_3500.mp4',
    thumbnail_path: '/media/clips/test_clip_3500_thumb.jpg',
    duration_sec: 6,
    file_size_kb: 1380
  }
];

/**
 * GET /api/results
 * Returns paginated detection results with joined clips, cameras, and alerts.
 */
async function getResults(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const {
    module: moduleFilter,
    event_type: eventTypeFilter,
    camera_id: cameraIdFilter,
    severity: severityFilter,
    date_from: dateFrom,
    date_to: dateTo,
    search,
    sort = 'newest'
  } = req.query;

  try {
    let whereConditions = [];
    let queryParams = [];

    if (moduleFilter && moduleFilter !== 'all') {
      whereConditions.push('(e.source_module = ? OR e.module = ?)');
      queryParams.push(moduleFilter, moduleFilter);
    }
    if (eventTypeFilter) {
      whereConditions.push('e.event_type = ?');
      queryParams.push(eventTypeFilter);
    }
    if (cameraIdFilter) {
      whereConditions.push('e.camera_id = ?');
      queryParams.push(cameraIdFilter);
    }
    if (severityFilter && severityFilter !== 'all') {
      whereConditions.push('a.severity = ?');
      queryParams.push(severityFilter);
    }
    if (dateFrom) {
      whereConditions.push('e.detected_at >= ?');
      queryParams.push(dateFrom);
    }
    if (dateTo) {
      whereConditions.push('e.detected_at <= ?');
      queryParams.push(dateTo);
    }
    if (search) {
      whereConditions.push('(e.description LIKE ? OR e.object_type LIKE ? OR e.event_type LIKE ? OR c.name LIKE ?)');
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let orderBy = 'e.detected_at DESC';
    if (sort === 'oldest') {
      orderBy = 'e.detected_at ASC';
    } else if (sort === 'highest_severity') {
      orderBy = "FIELD(COALESCE(a.severity, 'info'), 'danger', 'warning', 'info'), e.detected_at DESC";
    }

    // 1. Total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) AS total
      FROM detection_events e
      LEFT JOIN cameras c ON e.camera_id = c.camera_id
      LEFT JOIN alerts a ON e.event_id = a.event_id
      ${whereClause}
    `, queryParams);

    const total = countResult[0].total;

    // 2. Fetch rows
    const [rows] = await db.query(`
      SELECT 
        e.event_id,
        e.camera_id,
        COALESCE(e.source_module, e.module) AS source_module,
        e.event_type,
        e.module,
        e.object_type,
        e.confidence,
        e.bounding_box,
        e.detected_at,
        e.metadata,
        e.description,
        e.processing_fps,
        c.name AS camera_name,
        c.location AS camera_location,
        c.zone_type,
        cl.clip_id,
        cl.file_path AS clip_path,
        cl.thumbnail_path,
        cl.duration_sec,
        cl.file_size_kb,
        cl.is_locked,
        a.alert_id,
        a.alert_type,
        COALESCE(a.severity, 'info') AS severity,
        a.status AS alert_status
      FROM detection_events e
      LEFT JOIN cameras c ON e.camera_id = c.camera_id
      LEFT JOIN clips cl ON e.event_id = cl.event_id
      LEFT JOIN alerts a ON e.event_id = a.event_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    // Format fields
    const formattedRows = rows.map(r => ({
      ...r,
      bounding_box: typeof r.bounding_box === 'string' ? JSON.parse(r.bounding_box) : r.bounding_box,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      clip_path: r.clip_path || (r.metadata && r.metadata.clip_info ? r.metadata.clip_info.file_path : null),
      thumbnail_path: r.thumbnail_path || (r.metadata && r.metadata.clip_info ? r.metadata.clip_info.thumbnail_path : null)
    }));

    return res.json({
      success: true,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      results: formattedRows
    });

  } catch (err) {
    console.warn(`[Results API Warning] Database query failed (${err.message}). Using fallback mock data.`);

    // Filter fallback data in offline mode
    let filtered = [...MOCK_RESULTS];
    if (moduleFilter && moduleFilter !== 'all') {
      filtered = filtered.filter(r => r.source_module === moduleFilter || r.module === moduleFilter);
    }
    if (severityFilter && severityFilter !== 'all') {
      filtered = filtered.filter(r => r.severity === severityFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r => 
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.object_type && r.object_type.toLowerCase().includes(q)) ||
        (r.camera_name && r.camera_name.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      total: filtered.length,
      page: 1,
      limit,
      total_pages: 1,
      results: filtered,
      mode: 'fallback'
    });
  }
}

/**
 * GET /api/results/summary
 * Returns KPI counters and breakdown for the Results portal header.
 */
async function getResultsSummary(req, res) {
  try {
    const [totalRows] = await db.query('SELECT COUNT(*) AS total FROM detection_events');
    const [recentRows] = await db.query('SELECT COUNT(*) AS recent FROM detection_events WHERE detected_at >= NOW() - INTERVAL 24 HOUR');
    const [moduleRows] = await db.query('SELECT COALESCE(source_module, module) AS mod_name, COUNT(*) AS cnt FROM detection_events GROUP BY mod_name');
    const [severityRows] = await db.query('SELECT COALESCE(severity, "info") AS sev, COUNT(*) AS cnt FROM alerts GROUP BY sev');
    const [cameraRows] = await db.query('SELECT COUNT(DISTINCT camera_id) AS active_cams FROM detection_events');
    const [clipRows] = await db.query('SELECT COUNT(*) AS total_clips FROM clips');

    const byModule = {};
    moduleRows.forEach(r => { byModule[r.mod_name] = r.cnt; });

    const bySeverity = { danger: 0, warning: 0, info: 0 };
    severityRows.forEach(r => { bySeverity[r.sev] = r.cnt; });

    return res.json({
      success: true,
      summary: {
        total_results: totalRows[0].total || 0,
        recent_24h: recentRows[0].recent || 0,
        total_clips: clipRows[0].total_clips || 0,
        active_cameras: cameraRows[0].active_cams || 0,
        by_module: byModule,
        by_severity: bySeverity
      }
    });
  } catch (err) {
    return res.json({
      success: true,
      summary: {
        total_results: MOCK_RESULTS.length,
        recent_24h: MOCK_RESULTS.length,
        total_clips: MOCK_RESULTS.length,
        active_cameras: 4,
        by_module: { velocity: 1, anpr: 1, threat: 1, misplacement: 1, entry: 1 },
        by_severity: { danger: 3, warning: 1, info: 1 }
      },
      mode: 'fallback'
    });
  }
}

/**
 * GET /api/results/:id
 * Returns single detection result detail.
 */
async function getResultById(req, res) {
  const eventId = req.params.id;

  try {
    const [rows] = await db.query(`
      SELECT 
        e.event_id,
        e.camera_id,
        COALESCE(e.source_module, e.module) AS source_module,
        e.event_type,
        e.module,
        e.object_type,
        e.confidence,
        e.bounding_box,
        e.detected_at,
        e.metadata,
        e.description,
        e.processing_fps,
        c.name AS camera_name,
        c.location AS camera_location,
        c.zone_type,
        cl.clip_id,
        cl.file_path AS clip_path,
        cl.thumbnail_path,
        cl.duration_sec,
        cl.file_size_kb,
        cl.is_locked,
        a.alert_id,
        a.alert_type,
        COALESCE(a.severity, 'info') AS severity,
        a.status AS alert_status
      FROM detection_events e
      LEFT JOIN cameras c ON e.camera_id = c.camera_id
      LEFT JOIN clips cl ON e.event_id = cl.event_id
      LEFT JOIN alerts a ON e.event_id = a.event_id
      WHERE e.event_id = ?
    `, [eventId]);

    if (rows.length === 0) {
      const mockFound = MOCK_RESULTS.find(r => String(r.event_id) === String(eventId));
      if (mockFound) {
        return res.json({ success: true, result: mockFound });
      }
      return res.status(404).json({ success: false, error: 'Detection result not found' });
    }

    const r = rows[0];
    const resultObj = {
      ...r,
      bounding_box: typeof r.bounding_box === 'string' ? JSON.parse(r.bounding_box) : r.bounding_box,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      clip_path: r.clip_path || (r.metadata && r.metadata.clip_info ? r.metadata.clip_info.file_path : null),
      thumbnail_path: r.thumbnail_path || (r.metadata && r.metadata.clip_info ? r.metadata.clip_info.thumbnail_path : null)
    };

    return res.json({ success: true, result: resultObj });
  } catch (err) {
    const mockFound = MOCK_RESULTS.find(r => String(r.event_id) === String(eventId));
    if (mockFound) {
      return res.json({ success: true, result: mockFound });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/results/:id/clip
 * Streams video clip with HTTP 206 Range Request support.
 */
async function streamClip(req, res) {
  const eventId = req.params.id;
  let filePath = null;

  try {
    const [rows] = await db.query('SELECT file_path FROM clips WHERE event_id = ? OR clip_id = ?', [eventId, eventId]);
    if (rows.length > 0 && rows[0].file_path) {
      filePath = rows[0].file_path;
    }
  } catch (dbErr) {
    // Fallback to sample video
  }

  // Resolve absolute path safely
  let absolutePath;
  if (filePath) {
    // Remove leading slash if any
    const rel = filePath.replace(/^\/+/, '');
    absolutePath = path.resolve(__dirname, '../../', rel);
  }

  // Fallback to root sample video if file is missing
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    const sampleVid = path.resolve(__dirname, '../../istockphoto-1408401025-mp4-480x480-is.mp4');
    if (fs.existsSync(sampleVid)) {
      absolutePath = sampleVid;
    } else {
      return res.status(404).json({ success: false, error: 'Video clip not found on server' });
    }
  }

  // HTTP Range request streaming for smooth seeking
  try {
    const stat = fs.statSync(absolutePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(absolutePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(absolutePath).pipe(res);
    }
  } catch (streamErr) {
    res.status(500).json({ success: false, error: streamErr.message });
  }
}

module.exports = {
  getResults,
  getResultsSummary,
  getResultById,
  streamClip
};
