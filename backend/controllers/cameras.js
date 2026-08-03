const db = require('../config/db');

exports.getCameras = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cameras ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
