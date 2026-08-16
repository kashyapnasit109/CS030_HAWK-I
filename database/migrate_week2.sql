-- Hawk-I Database Migration: Week 2 Canonical Event Foundation
USE hawki_db;

-- 1. Extend detection_events table with source module, granular event type, inline description, and processing FPS
ALTER TABLE detection_events
  ADD COLUMN IF NOT EXISTS source_module VARCHAR(50) NULL AFTER camera_id,
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) NULL AFTER source_module,
  ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER metadata,
  ADD COLUMN IF NOT EXISTS processing_fps DECIMAL(4, 2) NULL AFTER description;

-- 2. Add performance indexes for event querying and search filtering
CREATE INDEX IF NOT EXISTS idx_events_module_detected ON detection_events (module, detected_at);
CREATE INDEX IF NOT EXISTS idx_events_camera_detected ON detection_events (camera_id, detected_at);
CREATE INDEX IF NOT EXISTS idx_events_source_module ON detection_events (source_module);
