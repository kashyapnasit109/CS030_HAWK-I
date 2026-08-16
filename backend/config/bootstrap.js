const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function bootstrap() {
  console.log('[Database Status] Checking MySQL connection...');
  
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
  } catch (err) {
    console.warn(`[Database Warning] Could not connect to MySQL at ${dbConfig.host}:${dbConfig.port} (${err.message}).`);
    console.warn('[Database Warning] The system will automatically run in OFFLINE/FALLBACK mode with mock data.');
    return;
  }

  try {
    // Check if hawki_db exists
    const [databases] = await connection.query("SHOW DATABASES LIKE 'hawki_db'");
    let needBootstrap = false;

    if (databases.length === 0) {
      console.log("[Database Status] 'hawki_db' does not exist. Initializing database...");
      needBootstrap = true;
    } else {
      await connection.query('USE hawki_db');
      const [tables] = await connection.query('SHOW TABLES');
      // We expect 10 tables: users, cameras, zones, detection_events, clips, feedback, camera_health_logs, vehicles, alerts, event_embeddings
      if (tables.length < 10) {
        console.log(`[Database Status] Found only ${tables.length} tables. Re-initializing database...`);
        needBootstrap = true;
      }
    }

    if (needBootstrap) {
      console.log('[Database Status] Bootstrapping database schema and seed data...');
      
      // 1. Create DB
      await connection.query('CREATE DATABASE IF NOT EXISTS hawki_db');
      await connection.query('USE hawki_db');

      // 2. Schema
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      if (fs.existsSync(schemaPath)) {
        console.log('Applying schema.sql...');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await connection.query(schemaSql);
      }

      // 3. Seeds
      const seedPath = path.join(__dirname, '../../database/seed.sql');
      if (fs.existsSync(seedPath)) {
        console.log('Applying seed.sql...');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await connection.query(seedSql);
      }

      // 4. Migration
      const migratePath = path.join(__dirname, '../../database/migrate_prompt8.sql');
      if (fs.existsSync(migratePath)) {
        console.log('Applying migrate_prompt8.sql...');
        const migrateSql = fs.readFileSync(migratePath, 'utf8');
        await connection.query(migrateSql);
      }

      console.log('[Database Success] Database bootstrap completed successfully.');
    } else {
      console.log('[Database Success] Database connection established and tables verified.');
    }
  } catch (err) {
    console.error('[Database Error] Failed to verify or bootstrap database:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

module.exports = bootstrap;
