module.exports = { login, register };

/**
 * Authenticates a user by matching username and password against the users table.
 * Returns { success: true } on match, { success: false } otherwise.
 */
async function login(username, password, db) {
  return new Promise((resolve) => {
    db.get(
      'SELECT password FROM users WHERE username = ?',
      [username],
      (err, row) => {
        if (err || !row) {
          return resolve({ success: false });
        }
        // Simple string comparison (in production, use bcrypt or similar)
        const passwordMatch = password === row.password;
        resolve({ success: passwordMatch });
      }
    );
  });
}

/**
 * Registers a new user with the given username and password.
 * New users get default bio "BIO" and default profile picture "default_profpic.png".
 * Returns { success: true } on success, or { success: false, message: string } on failure.
 */
async function register({ username, password }, db) {
  return new Promise((resolve) => {
    // First, check if username already exists
    db.get(
      'SELECT id FROM users WHERE username = ?',
      [username],
      (err, row) => {
        if (err) {
          return resolve({ success: false, message: 'Database error' });
        }
        if (row) {
          return resolve({ success: false, message: 'Username already exists' });
        }

        // Username is available, insert new user
        db.run(
          'INSERT INTO users (username, password, bio, profile_picture, wallet_balance) VALUES (?, ?, ?, ?, ?)',
          [username, password, 'BIO', 'default_profpic.png', 1000.00],
          (err) => {
            if (err) {
              return resolve({ success: false, message: 'Failed to create user' });
            }
            resolve({ success: true });
          }
        );
      }
    );
  });
}
