const bcrypt = require('bcrypt');

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

async function login(username, password, db) {
  try {
    if (!username || !password) {
      return { success: false };
    }
    const user = await dbGet(db, "SELECT * FROM users WHERE username = ?", [username]);
    if (!user) {
      return { success: false };
    }

    // Securely verify password using bcrypt, with fallback for any legacy plaintext records
    let match = false;
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      match = await bcrypt.compare(password, user.password);
    } else {
      match = (password === user.password);
    }

    return { success: match };
  } catch (err) {
    console.error("Login error:", err);
    return { success: false };
  }
}

async function register({ username, password }, db) {
  try {
    if (!username || !password) {
      return { success: false, message: "Username and password are required." };
    }

    const existing = await dbGet(db, "SELECT id FROM users WHERE username = ?", [username]);
    if (existing) {
      return { success: false, message: "Username already exists." };
    }

    // Hash password securely with bcrypt (salt rounds = 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    await dbRun(
      db,
      "INSERT INTO users (username, password, bio, profile_picture, wallet_balance) VALUES (?, ?, ?, ?, ?)",
      [username, hashedPassword, "BIO", "default_profpic.png", 1000.00]
    );

    return { success: true };
  } catch (err) {
    console.error("Registration error:", err);
    return { success: false, message: "Internal server error during registration." };
  }
}

module.exports = { login, register };