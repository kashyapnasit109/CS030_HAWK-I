const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bootstrapDb = require('./config/bootstrap');

const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static media files (clips, thumbnails)
app.use('/media', express.static(path.join(__dirname, '../media')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cameras', require('./routes/cameras'));
app.use('/api/events', require('./routes/events'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/modules', require('./routes/modules'));
app.use('/api/search', require('./routes/search'));
app.use('/api/results', require('./routes/results'));

const PORT = process.env.PORT || 3000;

bootstrapDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Critical database bootstrap failure:', err);
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT} (fallback mode active)`);
  });
});

