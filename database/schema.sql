-- Hawk-I Database Schema

CREATE DATABASE IF NOT EXISTS hawki_db;
USE hawki_db;

-- 1. users
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'operator', 'viewer') NOT NULL
);

-- 2. cameras
CREATE TABLE IF NOT EXISTS cameras (
  camera_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  zone_type ENUM('indoor', 'outdoor', 'perimeter', 'parking', 'entrance', 'other') NOT NULL,
  status ENUM('online', 'offline', 'warning') NOT NULL,
  last_seen DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. zones
CREATE TABLE IF NOT EXISTS zones (
  zone_id INT AUTO_INCREMENT PRIMARY KEY,
  camera_id INT NOT NULL,
  label VARCHAR(255) NOT NULL,
  polygon_coords JSON,
  zone_purpose VARCHAR(255),
  FOREIGN KEY (camera_id) REFERENCES cameras(camera_id) ON DELETE CASCADE
);

-- 4. detection_events
CREATE TABLE IF NOT EXISTS detection_events (
  event_id INT AUTO_INCREMENT PRIMARY KEY,
  camera_id INT NOT NULL,
  module ENUM('intrusion', 'loitering', 'vehicle', 'facial', 'object', 'crowd') NOT NULL,
  object_type VARCHAR(100),
  confidence DECIMAL(5, 4),
  bounding_box JSON,
  detected_at DATETIME NOT NULL,
  metadata JSON,
  FOREIGN KEY (camera_id) REFERENCES cameras(camera_id) ON DELETE CASCADE
);

-- 5. clips
CREATE TABLE IF NOT EXISTS clips (
  clip_id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  thumbnail_path VARCHAR(512),
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  duration_sec INT,
  file_size_kb INT,
  is_locked BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (event_id) REFERENCES detection_events(event_id) ON DELETE CASCADE
);

-- 6. vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
  plate_number VARCHAR(50) NOT NULL UNIQUE,
  owner_name VARCHAR(255),
  registered_on DATETIME
);

-- 7. alerts
CREATE TABLE IF NOT EXISTS alerts (
  alert_id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  alert_type VARCHAR(255) NOT NULL,
  severity ENUM('info', 'warning', 'danger') NOT NULL,
  status ENUM('open', 'acknowledged', 'resolved') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES detection_events(event_id) ON DELETE CASCADE
);

-- 8. feedback
CREATE TABLE IF NOT EXISTS feedback (
  feedback_id INT AUTO_INCREMENT PRIMARY KEY,
  alert_id INT NOT NULL,
  marked_false_positive BOOLEAN DEFAULT FALSE,
  note TEXT,
  reviewed_by INT,
  FOREIGN KEY (alert_id) REFERENCES alerts(alert_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 9. camera_health_logs
CREATE TABLE IF NOT EXISTS camera_health_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  camera_id INT NOT NULL,
  status ENUM('online', 'offline', 'warning') NOT NULL,
  checked_at DATETIME NOT NULL,
  FOREIGN KEY (camera_id) REFERENCES cameras(camera_id) ON DELETE CASCADE
);

-- 10. event_embeddings
CREATE TABLE IF NOT EXISTS event_embeddings (
  embedding_id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL UNIQUE,
  description_text TEXT NOT NULL,
  embedding_vector JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES detection_events(event_id) ON DELETE CASCADE
);
