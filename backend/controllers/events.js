const db = require('../config/db');

exports.getEvents = async (req, res) => {
  try {
    const { module, camera_id } = req.query;
    let query = 'SELECT * FROM detection_events WHERE 1=1';
    let params = [];
    
    if (module) {
      query += ' AND module = ?';
      params.push(module);
    }
    if (camera_id) {
      query += ' AND camera_id = ?';
      params.push(camera_id);
    }
    query += ' ORDER BY detected_at DESC LIMIT 100';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
