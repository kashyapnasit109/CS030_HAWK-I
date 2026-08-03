const db = require('../config/db');

exports.getVehicles = async (req, res) => {
  try {
    const { plate_number } = req.query;
    let query = 'SELECT * FROM vehicles WHERE 1=1';
    let params = [];

    if (plate_number) {
      query += ' AND plate_number LIKE ?';
      params.push(`%${plate_number}%`);
    }
    
    query += ' ORDER BY registered_on DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
