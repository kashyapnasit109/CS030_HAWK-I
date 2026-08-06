-- Migration for Prompt 8: Semantic Search

CREATE TABLE IF NOT EXISTS event_embeddings (
  embedding_id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL UNIQUE,
  description_text TEXT NOT NULL,
  embedding_vector JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES detection_events(event_id) ON DELETE CASCADE
);
