const db = require('../config/db');
const FormData = require('form-data');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

exports.testAnpr = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    // Forward the image to the ML service
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // Use dynamic import for node-fetch (ESM module)
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

    // If no detection, return as-is
    if (mlResult.detection === 'no_detection') {
      return res.json({
        ...mlResult,
        registry_match: false,
        matched_vehicle: null,
      });
    }

    // Cross-check plate_text against vehicles table
    const plateText = mlResult.plate_text;
    const [rows] = await db.query(
      'SELECT * FROM vehicles WHERE plate_number = ?',
      [plateText]
    );

    const registryMatch = rows.length > 0;
    const matchedVehicle = registryMatch ? rows[0] : null;

    return res.json({
      ...mlResult,
      registry_match: registryMatch,
      matched_vehicle: matchedVehicle,
    });
  } catch (err) {
    console.error('ANPR test error:', err);
    
    // Check if it's a connection error to ML service
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'ML service is not running. Start it with: uvicorn main:app --port 8000',
      });
    }
    
    res.status(500).json({ error: 'Server error during ANPR test.' });
  }
};
