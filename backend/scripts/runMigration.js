const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function run() {
  try {
    const sqlPath = path.join(__dirname, '../../database/migrate_prompt8.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolons for multiple statements if any
    const statements = sql.split(';').filter(stmt => stmt.trim() !== '');
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        await db.query(stmt);
      }
    }
    
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
