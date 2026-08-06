const db = require('../config/db');
const mlService = require('../services/mlService');

// Cosine similarity utility
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

exports.searchEvents = async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // 1. Embed the search query
    let queryEmbedding;
    try {
      const embedRes = await mlService.callEmbed(query);
      queryEmbedding = embedRes.embedding;
    } catch (err) {
      console.error('Failed to embed query:', err);
      return res.status(500).json({ error: 'ML Service failed to embed query' });
    }

    // 2. Fetch all stored embeddings
    const [rows] = await db.query(`
      SELECT 
        emb.embedding_vector,
        emb.description_text,
        e.event_id,
        e.module,
        e.object_type,
        e.detected_at,
        e.metadata,
        c.name as camera_name,
        c.zone_type
      FROM event_embeddings emb
      JOIN detection_events e ON emb.event_id = e.event_id
      JOIN cameras c ON e.camera_id = c.camera_id
    `);

    // 3. Compute cosine similarity (Brute-force O(N))
    const results = [];
    for (const row of rows) {
      let vec;
      try {
        vec = typeof row.embedding_vector === 'string' ? JSON.parse(row.embedding_vector) : row.embedding_vector;
      } catch (e) {
        continue;
      }
      
      const score = cosineSimilarity(queryEmbedding, vec);
      results.push({
        event_id: row.event_id,
        description: row.description_text,
        similarity_score: score,
        camera_name: row.camera_name,
        zone_type: row.zone_type,
        detected_at: row.detected_at,
        module: row.module,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      });
    }

    // 4. Sort and return top N
    results.sort((a, b) => b.similarity_score - a.similarity_score);
    const topN = results.slice(0, parseInt(limit));

    res.json(topN);

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error during search' });
  }
};
