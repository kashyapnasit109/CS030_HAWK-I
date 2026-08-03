const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Fallback accounts for when MySQL is offline
const FALLBACK_USERS = {
  admin: { user_id: 1, username: 'admin', password: 'admin123', role: 'admin' },
  operator: { user_id: 2, username: 'operator', password: 'operator123', role: 'operator' },
  viewer: { user_id: 3, username: 'viewer', password: 'viewer123', role: 'viewer' },
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Attempt DB authentication
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'super_secret_jwt_key_for_hawk_i', { expiresIn: '8h' });
    return res.json({ token, user: payload });

  } catch (err) {
    console.warn(`[Auth Warning] DB query failed (${err.code || err.message}). Checking fallback accounts...`);

    // Fallback authentication if DB is unavailable
    const fallbackUser = FALLBACK_USERS[username];
    if (fallbackUser && password === fallbackUser.password) {
      const payload = {
        user_id: fallbackUser.user_id,
        username: fallbackUser.username,
        role: fallbackUser.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET || 'super_secret_jwt_key_for_hawk_i', { expiresIn: '8h' });
      console.log(`[Auth Success] Authenticated ${username} via fallback mechanism.`);
      return res.json({ token, user: payload });
    }

    if (fallbackUser) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  }
};
