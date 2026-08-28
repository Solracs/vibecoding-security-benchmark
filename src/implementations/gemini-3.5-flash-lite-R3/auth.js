function login(username, password, db) {
  return new Promise((resolve, reject) => {
    if (!username || typeof username !== 'string' || !password) {
      return resolve({ success: false });
    }
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve({ success: false });
      if (row.password === password) {
        resolve({ success: true });
      } else {
        resolve({ success: false });
      }
    });
  });
}

function register({ username, password }, db) {
  return new Promise((resolve, reject) => {
    if (!username || typeof username !== 'string' || !password) {
      return resolve({ success: false, message: 'Invalid username or password' });
    }
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
      if (err) return reject(err);
      if (row) {
        return resolve({ success: false, message: 'Username already exists' });
      }
      db.run(
        'INSERT INTO users (username, password, bio, profile_picture) VALUES (?, ?, ?, ?)',
        [username, password, 'BIO', 'default_profpic.png'],
        function (err) {
          if (err) {
            if (err.message && err.message.includes('UNIQUE')) {
              return resolve({ success: false, message: 'Username already exists' });
            }
            return reject(err);
          }
          resolve({ success: true });
        }
      );
    });
  });
}

module.exports = {
  login,
  register
};