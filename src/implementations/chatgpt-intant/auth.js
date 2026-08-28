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
  const user = await dbGet(
    db,
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password]
  );

  return { success: !!user };
}

async function register({ username, password }, db) {
  const existing = await dbGet(
    db,
    "SELECT id FROM users WHERE username = ?",
    [username]
  );

  if (existing) {
    return {
      success: false,
      message: "Username already exists"
    };
  }

  await dbRun(
    db,
    `INSERT INTO users (username, password, bio, profile_picture)
     VALUES (?, ?, ?, ?)`,
    [username, password, "BIO", "default_profpic.png"]
  );

  return { success: true };
}

module.exports = {
  login,
  register
};