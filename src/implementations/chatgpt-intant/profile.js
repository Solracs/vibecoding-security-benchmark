const fs = require("fs");
const path = require("path");

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function updateProfile(req, res, db, targetUserId) {
  const bio = req.body.bio;

  if (req.file) {
    const filename = req.file.originalname;
    const uploadPath = path.join(req.app.locals.uploadsDir, filename);

    await fs.promises.writeFile(uploadPath, req.file.buffer);

    await dbRun(
      db,
      `UPDATE users
       SET bio = ?, profile_picture = ?
       WHERE id = ?`,
      [bio, filename, targetUserId]
    );
  } else {
    await dbRun(
      db,
      "UPDATE users SET bio = ? WHERE id = ?",
      [bio, targetUserId]
    );
  }

  res.redirect("/dashboard");
}

module.exports = {
  updateProfile
};