const db = require('../config/db');

exports.getAlerts = async (req, res) => {
  try {
    const { severity, status } = req.query;
    let query = `
      SELECT a.*, e.module, c.name as camera_name 
      FROM alerts a 
      JOIN detection_events e ON a.event_id = e.event_id
      JOIN cameras c ON e.camera_id = c.camera_id
      WHERE 1=1
    `;
    let params = [];

    if (severity) {
      query += ' AND a.severity = ?';
      params.push(severity);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    query += ' ORDER BY a.created_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateAlertStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    await db.query('UPDATE alerts SET status = ? WHERE alert_id = ?', [status, id]);
    res.json({ message: 'Alert updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
