const db = require('../config/db');
const mlService = require('../services/mlService');
const descriptionService = require('../services/descriptionService');

async function runBackfill() {
  console.log('Starting Event Embeddings Backfill...');

  try {
    // Find all detection_events that don't have an embedding yet
    const [events] = await db.query(`
      SELECT e.*, c.name as camera_name, c.zone_type 
      FROM detection_events e
      JOIN cameras c ON e.camera_id = c.camera_id
      LEFT JOIN event_embeddings emb ON e.event_id = emb.event_id
      WHERE emb.embedding_id IS NULL
    `);

    console.log(`Found ${events.length} events needing embeddings.`);

    if (events.length === 0) {
      console.log('Nothing to do. Exiting.');
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const evt of events) {
      try {
        const metadata = typeof evt.metadata === 'string' ? JSON.parse(evt.metadata) : (evt.metadata || {});
        
        const desc = descriptionService.generateDescription(
          evt.camera_name,
          evt.zone_type,
          evt.detected_at,
          evt.module,
          evt.object_type || 'object',
          metadata
        );

        const embedRes = await mlService.callEmbed(desc);
        
        if (embedRes && embedRes.embedding) {
          await db.query(`
            INSERT INTO event_embeddings (event_id, description_text, embedding_vector)
            VALUES (?, ?, ?)
          `, [evt.event_id, desc, JSON.stringify(embedRes.embedding)]);
          successCount++;
          console.log(`[OK] Embedded Event ID ${evt.event_id}`);
        } else {
          throw new Error('Empty embedding response');
        }
      } catch (err) {
        errorCount++;
        console.error(`[ERROR] Failed to embed Event ID ${evt.event_id}:`, err.message);
      }
    }

    console.log('-----------------------------------');
    console.log(`Backfill Complete. Success: ${successCount}, Errors: ${errorCount}`);
    process.exit(0);

  } catch (err) {
    console.error('Fatal Error during backfill:', err);
    process.exit(1);
  }
}

runBackfill();
