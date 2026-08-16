const db = require('../config/db');
const mlService = require('../services/mlService');

/**
 * Cosine similarity computation between two normalized/unnormalized float vectors.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
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

/**
 * POST /api/search
 * Natural language semantic search over detection events with optional filters.
 */
exports.searchEvents = async (req, res) => {
  try {
    const {
      query,
      module,
      source_module,
      camera_id,
      start_date,
      end_date,
      min_score = 0.0,
      limit = 10,
      offset = 0
    } = req.body;
    
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Search query string is required' });
    }

    // 1. Embed query vector via ML Service
    let queryEmbedding;
    try {
      const embedRes = await mlService.callEmbed(query.trim());
      queryEmbedding = embedRes.embedding;
    } catch (err) {
      console.error('[SearchController] Failed to embed query via ML service:', err.message);
      return res.status(503).json({ error: 'ML Service failed to embed query vector' });
    }

    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      return res.status(500).json({ error: 'Invalid embedding returned by ML service' });
    }

    // 2. Fetch embeddings from DB with optional SQL pre-filtering
    let sql = `
      SELECT 
        emb.embedding_vector,
        emb.description_text,
        e.event_id,
        e.camera_id,
        e.module,
        e.source_module,
        e.event_type,
        e.object_type,
        e.confidence,
        e.detected_at,
        e.metadata,
        c.name AS camera_name,
        c.zone_type,
        c.location AS camera_location
      FROM event_embeddings emb
      JOIN detection_events e ON emb.event_id = e.event_id
      LEFT JOIN cameras c ON e.camera_id = c.camera_id
      WHERE 1=1
    `;
    const params = [];

    if (module) {
      sql += ' AND e.module = ?';
      params.push(module);
    }
    if (source_module) {
      sql += ' AND e.source_module = ?';
      params.push(source_module);
    }
    if (camera_id) {
      sql += ' AND e.camera_id = ?';
      params.push(camera_id);
    }
    if (start_date) {
      sql += ' AND e.detected_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND e.detected_at <= ?';
      params.push(end_date);
    }

    const [rows] = await db.query(sql, params);

    // If no embeddings exist, return empty array gracefully
    if (!rows || rows.length === 0) {
      return res.json([]);
    }

    // 3. Compute cosine similarity for each candidate event
    const results = [];
    const minScoreNum = parseFloat(min_score) || 0.0;

    for (const row of rows) {
      let vec;
      try {
        vec = typeof row.embedding_vector === 'string' 
          ? JSON.parse(row.embedding_vector) 
          : row.embedding_vector;
      } catch (e) {
        continue;
      }

      if (!Array.isArray(vec)) continue;

      const score = cosineSimilarity(queryEmbedding, vec);
      if (score < minScoreNum) continue;

      let metaObj = {};
      if (row.metadata) {
        try {
          metaObj = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        } catch (_) {}
      }

      results.push({
        event_id: row.event_id,
        camera_id: row.camera_id,
        camera_name: row.camera_name || `CAM-${row.camera_id}`,
        zone_type: row.zone_type || 'unknown',
        camera_location: row.camera_location || '',
        module: row.module,
        source_module: row.source_module || row.module,
        event_type: row.event_type || 'detection',
        object_type: row.object_type,
        confidence: row.confidence,
        detected_at: row.detected_at,
        description: row.description_text,
        similarity_score: roundDec(score, 4),
        metadata: metaObj
      });
    }

    // 4. Rank by similarity score descending and paginate
    results.sort((a, b) => b.similarity_score - a.similarity_score);
    const paginated = results.slice(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10));

    res.json(paginated);
  } catch (err) {
    console.error('[SearchController] Search error:', err);
    res.status(500).json({ error: 'Internal server error during semantic search' });
  }
};

function roundDec(val, decimals = 4) {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
