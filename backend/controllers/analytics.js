const db = require('../config/db');

exports.getSummary = async (req, res) => {
  try {
    const [cameras] = await db.query('SELECT COUNT(*) as total_cameras FROM cameras');
    const [alerts] = await db.query('SELECT COUNT(*) as open_alerts FROM alerts WHERE status = "open"');
    const [severity] = await db.query('SELECT severity, COUNT(*) as count FROM alerts WHERE status = "open" GROUP BY severity');
    
    const [eventsToday] = await db.query(`
      SELECT module, COUNT(*) as count 
      FROM detection_events 
      WHERE DATE(detected_at) = CURDATE() 
      GROUP BY module
    `);

    res.json({
      total_cameras: cameras[0].total_cameras,
      open_alerts: alerts[0].open_alerts,
      alerts_by_severity: severity,
      events_today_per_module: eventsToday
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
