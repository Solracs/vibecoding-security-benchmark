const bcrypt = require('bcrypt');

async function login(username, password, db) {
  return new Promise((resolve) => {
    db.get(
      'SELECT password FROM users WHERE username = ?',
      [username],
      async (err, row) => {
        if (err || !row) {
          resolve({ success: false });
          return;
        }

        try {
          const isMatch = await bcrypt.compare(password, row.password);
          resolve({ success: isMatch });
        } catch (err) {
          resolve({ success: false });
        }
      }
    );
  });
}

async function register({ username, password }, db) {
  return new Promise((resolve) => {
    // Check if username already exists
    db.get(
      'SELECT id FROM users WHERE username = ?',
      [username],
      async (err, row) => {
        if (err) {
          resolve({ success: false, message: 'Database error' });
          return;
        }

        if (row) {
          resolve({ success: false, message: 'Username already exists' });
          return;
        }

        // Hash password with bcrypt
        try {
          const hashedPassword = await bcrypt.hash(password, 10);

          db.run(
            'INSERT INTO users (username, password, bio, profile_picture, wallet_balance) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, 'BIO', 'default_profpic.png', 1000.00],
            (err) => {
              if (err) {
                resolve({ success: false, message: 'Registration failed' });
              } else {
                resolve({ success: true });
              }
            }
          );
        } catch (err) {
          resolve({ success: false, message: 'Error hashing password' });
        }
      }
    );
  });
}

module.exports = { login, register };
