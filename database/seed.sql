-- Hawk-I Database Seed Data

USE hawki_db;

-- Clear existing data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE feedback;
TRUNCATE TABLE alerts;
TRUNCATE TABLE clips;
TRUNCATE TABLE detection_events;
TRUNCATE TABLE zones;
TRUNCATE TABLE camera_health_logs;
TRUNCATE TABLE cameras;
TRUNCATE TABLE vehicles;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. users
-- Passwords: admin123, operator123, viewer123
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2b$10$DUtpKCBEY94QJ1vlK4DU4.yvYeTncFSZbf0RMMhg2LYoqykLDQy3S', 'admin'),
('operator', '$2b$10$1oBekk2flPQKqcQgisKJYufpr0hMeEwSeuS8X9fJCXdI47LxX3liO', 'operator'),
('viewer', '$2b$10$Fw1KSWWjnLEoEkT4tNxtaevOp8L1gj8D3WVuk.uMkHV.FUtM5tazm', 'viewer');

-- 2. cameras
INSERT INTO cameras (camera_id, name, location, zone_type, status, last_seen) VALUES
(1, 'CAM-01', 'Main Entrance Gate', 'entrance', 'online', NOW()),
(2, 'CAM-02', 'Lobby East', 'indoor', 'online', NOW()),
(3, 'CAM-03', 'Server Room A', 'indoor', 'warning', NOW() - INTERVAL 10 MINUTE),
(4, 'CAM-04', 'Parking Lot North', 'parking', 'online', NOW()),
(5, 'CAM-05', 'Loading Dock B', 'outdoor', 'offline', NOW() - INTERVAL 5 HOUR),
(6, 'CAM-06', 'Perimeter Fence South', 'perimeter', 'online', NOW()),
(7, 'CAM-07', 'Executive Floor Hallway', 'indoor', 'online', NOW()),
(8, 'CAM-08', 'Cafeteria Overlook', 'indoor', 'online', NOW());

-- 3. zones
INSERT INTO zones (camera_id, label, polygon_coords, zone_purpose) VALUES
(1, 'Entry Gate Checkpoint', '[{"x":100,"y":200},{"x":300,"y":200},{"x":300,"y":400},{"x":100,"y":400}]', 'vehicle monitoring'),
(3, 'Rack 1 Restricted Area', '[{"x":50,"y":50},{"x":250,"y":50},{"x":250,"y":250},{"x":50,"y":250}]', 'intrusion detection'),
(6, 'South Fence Line', '[{"x":0,"y":100},{"x":640,"y":100},{"x":640,"y":150},{"x":0,"y":150}]', 'perimeter breach monitoring');

-- 4. detection_events
INSERT INTO detection_events (event_id, camera_id, module, object_type, confidence, bounding_box, detected_at, metadata) VALUES
(1, 1, 'vehicle', 'car', 0.9850, '{"x":120,"y":220,"w":150,"h":100}', NOW() - INTERVAL 5 MINUTE, '{"plate": "KA-01-AB-1234"}'),
(2, 6, 'intrusion', 'person', 0.9210, '{"x":40,"y":110,"w":40,"h":80}', NOW() - INTERVAL 1 HOUR, '{"behavior": "climbing"}'),
(3, 4, 'loitering', 'person', 0.8800, '{"x":300,"y":150,"w":40,"h":100}', NOW() - INTERVAL 2 HOUR, '{"duration_sec": 450}'),
(4, 2, 'facial', 'person', 0.9500, '{"x":320,"y":240,"w":60,"h":60}', NOW() - INTERVAL 3 HOUR, '{"match_id": "emp_405"}'),
(5, 5, 'object', 'backpack', 0.8200, '{"x":400,"y":300,"w":50,"h":60}', NOW() - INTERVAL 1 DAY, '{"abandoned": true}'),
(6, 8, 'crowd', 'group', 0.9100, '{"x":100,"y":100,"w":400,"h":300}', NOW() - INTERVAL 2 DAY, '{"count": 35}'),
(7, 3, 'intrusion', 'person', 0.9700, '{"x":150,"y":150,"w":50,"h":120}', NOW() - INTERVAL 3 DAY, '{"authorized": false}');
-- Adding a bunch more to make it 40+ events total for dashboard stats
-- (Generating dynamically with random intervals)
INSERT INTO detection_events (camera_id, module, object_type, confidence, bounding_box, detected_at)
SELECT 
  FLOOR(1 + RAND() * 8), 
  ELT(FLOOR(1 + RAND() * 6), 'intrusion', 'loitering', 'vehicle', 'facial', 'object', 'crowd'), 
  ELT(FLOOR(1 + RAND() * 4), 'person', 'car', 'truck', 'unknown'), 
  0.6000 + (RAND() * 0.3900), 
  '{"x":100,"y":100,"w":50,"h":50}', 
  NOW() - INTERVAL FLOOR(RAND() * 160) HOUR
FROM information_schema.columns LIMIT 35;

-- 5. alerts
INSERT INTO alerts (event_id, alert_type, severity, status, created_at) VALUES
(1, 'Unknown Vehicle Detected', 'info', 'resolved', NOW() - INTERVAL 5 MINUTE),
(2, 'Perimeter Breach Detected', 'danger', 'open', NOW() - INTERVAL 1 HOUR),
(3, 'Extended Loitering in Parking', 'warning', 'open', NOW() - INTERVAL 2 HOUR),
(5, 'Unattended Baggage', 'warning', 'acknowledged', NOW() - INTERVAL 1 DAY),
(7, 'Unauthorized Server Room Access', 'danger', 'resolved', NOW() - INTERVAL 3 DAY);
-- Add some random alerts for remaining events
INSERT INTO alerts (event_id, alert_type, severity, status, created_at)
SELECT 
  event_id, 
  CONCAT('Automated Alert: ', module), 
  ELT(FLOOR(1 + RAND() * 3), 'info', 'warning', 'danger'), 
  ELT(FLOOR(1 + RAND() * 3), 'open', 'acknowledged', 'resolved'), 
  detected_at
FROM detection_events 
WHERE event_id > 7 AND RAND() > 0.5 LIMIT 15;

-- 6. vehicles
INSERT INTO vehicles (plate_number, owner_name, registered_on) VALUES
('KA-01-AB-1234', 'John Doe', '2023-01-15 10:00:00'),
('MH-02-CD-5678', 'Jane Smith', '2023-02-20 11:30:00'),
('DL-03-EF-9012', 'Acme Corp', '2023-03-05 09:15:00'),
('TN-04-GH-3456', 'Robert Johnson', '2023-04-10 14:45:00'),
('UP-14-XY-9999', 'Logistics Ltd', '2023-05-12 08:00:00'),
('HR-26-ZZ-1111', 'Executive fleet', '2023-06-01 16:20:00'),
('WB-01-AA-2222', 'Michael Brown', '2023-07-22 10:10:00'),
('RJ-14-BB-3333', 'Sarah Williams', '2023-08-15 12:45:00'),
('GJ-01-CC-4444', 'David Miller', '2023-09-30 09:30:00'),
('TS-09-DD-5555', 'Emma Davis', '2023-10-18 15:00:00'),
('KL-01-EE-6666', 'James Wilson', '2023-11-25 11:15:00'),
('PB-10-FF-7777', 'Olivia Taylor', '2023-12-05 14:00:00');

-- 7. clips
INSERT INTO clips (event_id, file_path, start_time, end_time, duration_sec, file_size_kb) VALUES
(2, '/media/clips/evt_2.mp4', NOW() - INTERVAL 61 MINUTE, NOW() - INTERVAL 60 MINUTE, 60, 4500),
(7, '/media/clips/evt_7.mp4', NOW() - INTERVAL 72 MINUTE, NOW() - INTERVAL 71 MINUTE, 60, 4200);

-- 8. camera_health_logs
INSERT INTO camera_health_logs (camera_id, status, checked_at) VALUES
(3, 'warning', NOW() - INTERVAL 10 MINUTE),
(5, 'offline', NOW() - INTERVAL 5 HOUR);
