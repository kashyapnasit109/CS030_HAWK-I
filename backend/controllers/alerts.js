const db = require('../config/db');

const FALLBACK_ALERTS = [
  { alert_id: 1, event_id: 1, alert_type: 'Unknown Vehicle Detected', severity: 'info', status: 'resolved', created_at: new Date(Date.now() - 300000), camera_name: 'CAM-01' },
  { alert_id: 2, event_id: 2, alert_type: 'Perimeter Breach Detected', severity: 'danger', status: 'open', created_at: new Date(Date.now() - 3600000), camera_name: 'CAM-06' },
  { alert_id: 3, event_id: 3, alert_type: 'Extended Loitering in Parking', severity: 'warning', status: 'open', created_at: new Date(Date.now() - 7200000), camera_name: 'CAM-04' },
  { alert_id: 4, event_id: 5, alert_type: 'Unattended Baggage', severity: 'warning', status: 'acknowledged', created_at: new Date(Date.now() - 86400000), camera_name: 'CAM-05' },
  { alert_id: 5, event_id: 7, alert_type: 'Unauthorized Server Room Access', severity: 'danger', status: 'resolved', created_at: new Date(Date.now() - 259200000), camera_name: 'CAM-03' },
];

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
    console.warn(`[Alerts DB Warning] ${err.message}. Serving fallback alerts.`);
    res.json(FALLBACK_ALERTS);
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
    console.warn(`[Alerts DB Warning] ${err.message}. Updating in fallback mode.`);
    const alert = FALLBACK_ALERTS.find(a => a.alert_id === parseInt(id));
    if (alert) alert.status = req.body.status;
    res.json({ message: 'Alert updated successfully (fallback mode)' });
  }
};
