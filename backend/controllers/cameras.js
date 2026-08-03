const db = require('../config/db');

const FALLBACK_CAMERAS = [
  { camera_id: 1, name: 'CAM-01', location: 'Main Entrance Gate', zone_type: 'entrance', status: 'online', last_seen: new Date() },
  { camera_id: 2, name: 'CAM-02', location: 'Lobby East', zone_type: 'indoor', status: 'online', last_seen: new Date() },
  { camera_id: 3, name: 'CAM-03', location: 'Server Room A', zone_type: 'indoor', status: 'warning', last_seen: new Date() },
  { camera_id: 4, name: 'CAM-04', location: 'Parking Lot North', zone_type: 'parking', status: 'online', last_seen: new Date() },
  { camera_id: 5, name: 'CAM-05', location: 'Loading Dock B', zone_type: 'outdoor', status: 'offline', last_seen: new Date() },
  { camera_id: 6, name: 'CAM-06', location: 'Perimeter Fence South', zone_type: 'perimeter', status: 'online', last_seen: new Date() },
  { camera_id: 7, name: 'CAM-07', location: 'Executive Floor Hallway', zone_type: 'indoor', status: 'online', last_seen: new Date() },
  { camera_id: 8, name: 'CAM-08', location: 'Cafeteria Overlook', zone_type: 'indoor', status: 'online', last_seen: new Date() },
];

exports.getCameras = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cameras ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.warn(`[Cameras DB Warning] ${err.message}. Serving fallback cameras.`);
    res.json(FALLBACK_CAMERAS);
  }
};

const mlService = require('../services/mlService');

exports.simulateFeed = async (req, res) => {
  const { camera_id } = req.params;
  const { module_type, rule_parameters, backdate_timestamp, ...otherParams } = req.body;
  
  if (!module_type) {
    return res.status(400).json({ error: 'Missing module_type in request.' });
  }

  let mlResult;
  let severity = null;
  let alertType = null;
  let objectType = 'unknown';
  let dbModuleEnum = 'object'; // fallback

  try {
    switch (module_type) {
      case 'anpr': {
        const file = req.files?.file?.[0] || req.file;
        if (!file) return res.status(400).json({ error: 'Missing file for anpr.' });
        mlResult = await mlService.callAnpr(file.buffer, file.originalname, file.mimetype);
        
        dbModuleEnum = 'vehicle';
        objectType = 'vehicle';
        
        if (mlResult.detection !== 'no_detection') {
          const plateText = mlResult.plate_text;
          const [rows] = await db.query('SELECT * FROM vehicles WHERE plate_number = ?', [plateText]).catch(() => [[]]);
          const registryMatch = rows.length > 0;
          mlResult.registry_match = registryMatch;
          
          if (!registryMatch) {
            severity = 'warning';
            alertType = `Unregistered Vehicle Detected (${plateText})`;
          }
        }
        break;
      }
      
      case 'velocity': {
        const file = req.files?.file?.[0] || req.file;
        if (!file) return res.status(400).json({ error: 'Missing file for velocity.' });
        mlResult = await mlService.callVelocity(file.buffer, file.originalname, file.mimetype, otherParams);
        
        dbModuleEnum = 'vehicle';
        if (mlResult.tracked_objects && mlResult.tracked_objects.length > 0) {
          objectType = mlResult.tracked_objects[0].object_type || 'vehicle';
          const maxSpeed = mlResult.tracked_objects[0].max_speed_kmh;
          const threshold = Number(otherParams.speed_threshold || 10);
          
          if (maxSpeed > threshold * 1.5) {
            severity = 'danger';
            alertType = `High Velocity Warning: ${maxSpeed} km/h (Limit: ${threshold})`;
          } else if (maxSpeed > threshold) {
            severity = 'warning';
            alertType = `Speed Threshold Exceeded: ${maxSpeed} km/h (Limit: ${threshold})`;
          }
        }
        break;
      }
      
      case 'misplacement': {
        const ref = req.files?.reference?.[0];
        const curr = req.files?.current?.[0];
        if (!ref || !curr) return res.status(400).json({ error: 'Missing reference or current file.' });
        mlResult = await mlService.callMisplacement(ref.buffer, ref.originalname, ref.mimetype, curr.buffer, curr.originalname, curr.mimetype);
        
        dbModuleEnum = 'object';
        if (mlResult.differences && mlResult.differences.length > 0) {
          const missingCount = mlResult.differences.filter(d => d.change_type === 'missing_object').length;
          const newCount = mlResult.differences.filter(d => d.change_type === 'new_object').length;
          
          if (missingCount > 0) {
            severity = 'danger';
            alertType = `Missing Object Detected (${missingCount} item(s) absent)`;
          } else if (newCount > 0) {
            severity = 'warning';
            alertType = `Unrecognized Object Deposited (${newCount} new item(s))`;
          }
        }
        break;
      }
      
      case 'threat': {
        const file = req.files?.file?.[0] || req.file;
        if (!file) return res.status(400).json({ error: 'Missing file for threat.' });
        mlResult = await mlService.callThreat(file.buffer, file.originalname, file.mimetype, rule_parameters);
        
        dbModuleEnum = 'loitering';
        if (mlResult.anomalies && mlResult.anomalies.length > 0) {
          objectType = mlResult.anomalies[0].object_type || 'unknown';
          const rulesTriggered = mlResult.anomalies[0].triggered_rules || [];
          
          if (rulesTriggered.length >= 2) {
            severity = 'danger';
            alertType = `Multiple Threat Rules Triggered: ${rulesTriggered.join(', ')}`;
          } else if (rulesTriggered.length === 1) {
            severity = 'warning';
            alertType = `Threat Activity: ${rulesTriggered[0]}`;
          }
        }
        break;
      }
      
      case 'entry': {
        const entryGate = req.files?.entry_gate?.[0];
        const interior = req.files?.interior?.[0];
        if (!entryGate || !interior) return res.status(400).json({ error: 'Missing entry_gate or interior file.' });
        mlResult = await mlService.callEntry(entryGate.buffer, entryGate.originalname, entryGate.mimetype, interior.buffer, interior.originalname, interior.mimetype, otherParams);
        
        dbModuleEnum = 'intrusion';
        objectType = 'person';
        if (mlResult.flagged_entries && mlResult.flagged_entries.length > 0) {
          severity = 'danger';
          alertType = `Unauthorized Entry Flagged (${mlResult.flagged_entries.length} unmatched presences)`;
        }
        break;
      }
      
      default:
        return res.status(400).json({ error: 'Unsupported module_type.' });
    }
  } catch (err) {
    console.error('Simulation ML error:', err);
    return res.status(500).json({ error: `ML Service Error: ${err.message}` });
  }

  // Database updates
  try {
    let timestampToUse = 'NOW()';
    let queryArgs = [];
    if (backdate_timestamp) {
      timestampToUse = '?';
      queryArgs.push(backdate_timestamp);
    }

    const [eventResult] = await db.query(`
      INSERT INTO detection_events 
      (camera_id, module, object_type, confidence, detected_at, metadata)
      VALUES (?, ?, ?, ?, ${timestampToUse}, ?)
    `, [
      camera_id, 
      dbModuleEnum, 
      objectType, 
      1.0, 
      ...queryArgs,
      JSON.stringify(mlResult)
    ]);
    
    const eventId = eventResult.insertId;
    let alertId = null;

    if (severity && alertType) {
      const [alertResult] = await db.query(`
        INSERT INTO alerts (event_id, alert_type, severity, status)
        VALUES (?, ?, ?, 'open')
      `, [eventId, alertType, severity]);
      alertId = alertResult.insertId;
    }

    // Update Camera Health & Last Seen
    await db.query('UPDATE cameras SET last_seen = NOW(), status = "online" WHERE camera_id = ?', [camera_id]);
    await db.query('INSERT INTO camera_health_logs (camera_id, status, checked_at) VALUES (?, "online", NOW())', [camera_id]);

    return res.json({
      success: true,
      message: 'Simulated feed processed successfully',
      event_id: eventId,
      alert_id: alertId,
      severity,
      ml_result: mlResult
    });
  } catch (dbErr) {
    console.error('Simulation DB error:', dbErr);
    // If DB fails, just return success with ML result to unblock UI (it's a dev tool)
    return res.status(500).json({ 
      error: 'Database write failed. Returning ML result anyway.',
      ml_result: mlResult 
    });
  }
};
