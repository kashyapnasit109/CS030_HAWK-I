const db = require('../config/db');
const mlService = require('../services/mlService');

exports.testAnpr = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const mlResult = await mlService.callAnpr(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    if (mlResult.detection === 'no_detection') {
      return res.json({
        ...mlResult,
        registry_match: false,
        matched_vehicle: null,
      });
    }

    const plateText = mlResult.plate_text;
    let rows = [];
    try {
      [rows] = await db.query(
        'SELECT * FROM vehicles WHERE plate_number = ?',
        [plateText]
      );
    } catch (dbErr) {
      console.warn('[ANPR DB Warning] Vehicle DB lookup failed, checking fallback array.');
      const fallbackVehicles = [
        { vehicle_id: 1, plate_number: 'KA-01-AB-1234', owner_name: 'John Doe', registered_on: '2023-01-15 10:00:00' },
        { vehicle_id: 2, plate_number: 'MH-02-CD-5678', owner_name: 'Jane Smith', registered_on: '2023-02-20 11:30:00' },
      ];
      const match = fallbackVehicles.find(v => v.plate_number === plateText);
      if (match) rows = [match];
    }

    const registryMatch = rows.length > 0;
    const matchedVehicle = registryMatch ? rows[0] : null;

    return res.json({
      ...mlResult,
      registry_match: registryMatch,
      matched_vehicle: matchedVehicle,
    });
  } catch (err) {
    console.error('ANPR test error:', err);
    if (err.message.includes('ECONNREFUSED')) {
      return res.status(503).json({ error: 'ML service is not running.' });
    }
    res.status(500).json({ error: err.message || 'Server error during ANPR test.' });
  }
};

exports.testVelocity = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded.' });
    }

    const { x1, y1, x2, y2, distance_meters } = req.body;
    if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined || !distance_meters) {
      return res.status(400).json({ error: 'Missing calibration parameters (x1, y1, x2, y2, distance_meters).' });
    }

    const mlResult = await mlService.callVelocity(
      req.file.buffer,
      req.file.originalname || 'video.mp4',
      req.file.mimetype || 'video/mp4',
      { x1, y1, x2, y2, distance_meters }
    );

    return res.json(mlResult);
  } catch (err) {
    console.error('Velocity test error:', err);
    if (err.message.includes('ECONNREFUSED')) {
      return res.status(503).json({ error: 'ML service is not running.' });
    }
    res.status(500).json({ error: err.message || 'Server error during Velocity test.' });
  }
};

exports.testMisplacement = async (req, res) => {
  try {
    if (!req.files || !req.files.reference || !req.files.current) {
      return res.status(400).json({ error: 'Both reference and current image files must be uploaded.' });
    }

    const refFile = req.files.reference[0];
    const currFile = req.files.current[0];

    const mlResult = await mlService.callMisplacement(
      refFile.buffer, refFile.originalname || 'reference.jpg', refFile.mimetype || 'image/jpeg',
      currFile.buffer, currFile.originalname || 'current.jpg', currFile.mimetype || 'image/jpeg'
    );

    return res.json(mlResult);
  } catch (err) {
    console.error('Misplacement test error:', err);
    if (err.message.includes('ECONNREFUSED')) {
      return res.status(503).json({ error: 'ML service is not running.' });
    }
    res.status(500).json({ error: err.message || 'Server error during Misplacement test.' });
  }
};

exports.testThreat = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded.' });
    }

    const { rule_parameters } = req.body;
    if (!rule_parameters) {
      return res.status(400).json({ error: 'Missing rule_parameters.' });
    }

    const mlResult = await mlService.callThreat(
      req.file.buffer,
      req.file.originalname || 'video.mp4',
      req.file.mimetype || 'video/mp4',
      rule_parameters
    );

    return res.json(mlResult);
  } catch (err) {
    console.error('Threat test error:', err);
    if (err.message.includes('ECONNREFUSED')) {
      return res.status(503).json({ error: 'ML service is not running.' });
    }
    res.status(500).json({ error: err.message || 'Server error during Threat test.' });
  }
};

exports.testEntry = async (req, res) => {
  try {
    if (!req.files || !req.files.entry_gate || !req.files.interior) {
      return res.status(400).json({ error: 'Both entry_gate and interior video files must be uploaded.' });
    }

    const entryFile = req.files.entry_gate[0];
    const interiorFile = req.files.interior[0];
    
    const { time_window_minutes, entry_gate_start_time, interior_start_time } = req.body;

    const mlResult = await mlService.callEntry(
      entryFile.buffer, entryFile.originalname || 'entry.mp4', entryFile.mimetype || 'video/mp4',
      interiorFile.buffer, interiorFile.originalname || 'interior.mp4', interiorFile.mimetype || 'video/mp4',
      { time_window_minutes, entry_gate_start_time, interior_start_time }
    );

    return res.json(mlResult);
  } catch (err) {
    console.error('Entry test error:', err);
    if (err.message.includes('ECONNREFUSED')) {
      return res.status(503).json({ error: 'ML service is not running.' });
    }
    res.status(500).json({ error: err.message || 'Server error during Entry test.' });
  }
};
