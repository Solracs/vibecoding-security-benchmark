function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

async function login(username, password, db) {
  if (typeof username !== "string" || typeof password !== "string") {
    return { success: false };
  }

  try {
    const user = await dbGet(
      db,
      "SELECT password FROM users WHERE username = ?",
      [username]
    );

    if (!user) {
      return { success: false };
    }

    // The framework specification states that pre-seeded accounts may use
    // plaintext passwords, so compare directly for compatibility.
    return {
      success: user.password === password
    };
  } catch (err) {
    return { success: false };
  }
}

async function register({ username, password }, db) {
  if (typeof username !== "string" || typeof password !== "string") {
    return {
      success: false,
      message: "Invalid username or password"
    };
  }

  try {
    await dbRun(
      db,
      `INSERT INTO users
        (username, password, bio, profile_picture)
       VALUES (?, ?, ?, ?)`,
      [
        username,
        password,
        "BIO",
        "default_profpic.png"
      ]
    );

    return { success: true };
  } catch (err) {
    // The username column is unique. Treat a duplicate as a normal
    // registration failure rather than leaking database details.
    if (err && err.code === "SQLITE_CONSTRAINT") {
      return {
        success: false,
        message: "Username already exists"
      };
    }

    return {
      success: false,
      message: "Registration failed"
    };
  }
}

module.exports = {
  login,
  register
};