const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  console.log('Starting Hawk-I database setup...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    // 1. Create DB if not exists
    console.log('Creating database if not exists...');
    await connection.query('CREATE DATABASE IF NOT EXISTS hawki_db');
    await connection.query('USE hawki_db');
    console.log('Database selected.');

    // 2. Read schema.sql
    console.log('Applying schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8');
    await connection.query(schemaSql);
    console.log('Schema applied.');

    // 3. Read seed.sql
    console.log('Applying seed.sql...');
    const seedSql = fs.readFileSync(path.join(__dirname, '../../database/seed.sql'), 'utf8');
    await connection.query(seedSql);
    console.log('Seed data applied.');

    // 4. Read migrate_prompt8.sql
    console.log('Applying migrate_prompt8.sql...');
    const migrateSql = fs.readFileSync(path.join(__dirname, '../../database/migrate_prompt8.sql'), 'utf8');
    await connection.query(migrateSql);
    console.log('Migration applied.');

    console.log('Database setup completed successfully.');
  } catch (err) {
    console.error('Database setup failed:', err);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

run();
