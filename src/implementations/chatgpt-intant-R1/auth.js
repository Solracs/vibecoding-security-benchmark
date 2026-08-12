'use strict';

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function validCredential(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 255;
}

async function login(username, password, db) {
  if (!validCredential(username) || !validCredential(password)) {
    return { success: false };
  }

  try {
    const row = await dbGet(
      db,
      'SELECT password FROM users WHERE username = ?',
      [username]
    );

    if (!row) {
      return { success: false };
    }

    return { success: row.password === password };
  } catch {
    return { success: false };
  }
}

async function register({ username, password } = {}, db) {
  if (!validCredential(username) || !validCredential(password)) {
    return { success: false, message: 'Invalid username or password' };
  }

  try {
    await dbRun(
      db,
      `INSERT INTO users (username, password, bio, profile_picture)
       VALUES (?, ?, ?, ?)`,
      [username, password, 'BIO', 'default_profpic.png']
    );

    return { success: true };
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT') {
      return { success: false, message: 'Username already exists' };
    }

    return { success: false, message: 'Registration failed' };
  }
}

module.exports = { login, register };