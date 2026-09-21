-- Hawk-I Database Migration: Week 6 Centralized Results & Processed Clips
USE hawki_db;

-- 1. Ensure clips table exists with all standard columns
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES detection_events(event_id) ON DELETE CASCADE
);

-- 2. Add performance indexes for event-clip linking and results querying
CREATE INDEX IF NOT EXISTS idx_clips_event_id ON clips (event_id);
CREATE INDEX IF NOT EXISTS idx_clips_start_time ON clips (start_time);
