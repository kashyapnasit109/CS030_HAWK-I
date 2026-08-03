const db = require('../config/db');
const FormData = require('form-data');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

exports.testAnpr = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const fetch = (await import('node-fetch')).default;

    const mlResponse = await fetch(`${ML_SERVICE_URL}/detect/anpr`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!mlResponse.ok) {
      const errorBody = await mlResponse.text();
      return res.status(mlResponse.status).json({
        error: `ML service error: ${errorBody}`,
      });
    }

    const mlResult = await mlResponse.json();

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
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'ML service is not running on http://localhost:8000.',
      });
    }
    res.status(500).json({ error: 'Server error during ANPR test.' });
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

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname || 'video.mp4',
      contentType: req.file.mimetype || 'video/mp4',
    });
    formData.append('x1', x1);
    formData.append('y1', y1);
    formData.append('x2', x2);
    formData.append('y2', y2);
    formData.append('distance_meters', distance_meters);

    const fetch = (await import('node-fetch')).default;

    const mlResponse = await fetch(`${ML_SERVICE_URL}/detect/velocity`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!mlResponse.ok) {
      const errorBody = await mlResponse.text();
      return res.status(mlResponse.status).json({
        error: `ML service error: ${errorBody}`,
      });
    }

    const mlResult = await mlResponse.json();
    return res.json(mlResult);
  } catch (err) {
    console.error('Velocity test error:', err);
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'ML service is not running on http://localhost:8000.',
      });
    }
    res.status(500).json({ error: 'Server error during Velocity test.' });
  }
};

exports.testMisplacement = async (req, res) => {
  try {
    if (!req.files || !req.files.reference || !req.files.current) {
      return res.status(400).json({ error: 'Both reference and current image files must be uploaded.' });
    }

    const refFile = req.files.reference[0];
    const currFile = req.files.current[0];

    const formData = new FormData();
    formData.append('reference_file', refFile.buffer, {
      filename: refFile.originalname || 'reference.jpg',
      contentType: refFile.mimetype || 'image/jpeg',
    });
    formData.append('current_file', currFile.buffer, {
      filename: currFile.originalname || 'current.jpg',
      contentType: currFile.mimetype || 'image/jpeg',
    });

    const fetch = (await import('node-fetch')).default;

    const mlResponse = await fetch(`${ML_SERVICE_URL}/detect/misplacement`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!mlResponse.ok) {
      const errorBody = await mlResponse.text();
      return res.status(mlResponse.status).json({
        error: `ML service error: ${errorBody}`,
      });
    }

    const mlResult = await mlResponse.json();
    return res.json(mlResult);
  } catch (err) {
    console.error('Misplacement test error:', err);
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'ML service is not running on http://localhost:8000.',
      });
    }
    res.status(500).json({ error: 'Server error during Misplacement test.' });
  }
};
