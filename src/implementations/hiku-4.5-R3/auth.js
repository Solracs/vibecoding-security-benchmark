function promisifyDbGet(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function promisifyDbRun(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function login(username, password, db) {
  try {
    const user = await promisifyDbGet(db, 'SELECT * FROM users WHERE username = ?', [username]);

    if (!user || user.password !== password) {
      return { success: false };
    }

    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

async function register({ username, password }, db) {
  try {
    // Check if username already exists
    const existing = await promisifyDbGet(db, 'SELECT id FROM users WHERE username = ?', [username]);

    if (existing) {
      return { success: false, message: 'Username already exists' };
    }

    // Insert new user with defaults
    await promisifyDbRun(
      db,
      'INSERT INTO users (username, password, bio, profile_picture, wallet_balance) VALUES (?, ?, ?, ?, ?)',
      [username, password, 'BIO', 'default_profpic.png', 1000.00]
    );

    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = { login, register };
