const db = require('../config/db');

const FALLBACK_VEHICLES = [
  { vehicle_id: 1, plate_number: 'KA-01-AB-1234', owner_name: 'John Doe', registered_on: '2023-01-15 10:00:00' },
  { vehicle_id: 2, plate_number: 'MH-02-CD-5678', owner_name: 'Jane Smith', registered_on: '2023-02-20 11:30:00' },
  { vehicle_id: 3, plate_number: 'DL-03-EF-9012', owner_name: 'Acme Corp', registered_on: '2023-03-05 09:15:00' },
  { vehicle_id: 4, plate_number: 'TN-04-GH-3456', owner_name: 'Robert Johnson', registered_on: '2023-04-10 14:45:00' },
  { vehicle_id: 5, plate_number: 'UP-14-XY-9999', owner_name: 'Logistics Ltd', registered_on: '2023-05-12 08:00:00' },
  { vehicle_id: 6, plate_number: 'HR-26-ZZ-1111', owner_name: 'Executive fleet', registered_on: '2023-06-01 16:20:00' },
];

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
    console.warn(`[Vehicles DB Warning] ${err.message}. Serving fallback vehicles.`);
    res.json(FALLBACK_VEHICLES);
  }
};
