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
