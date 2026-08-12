const fs = require('fs');
const path = require('path');

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

async function updateProfile(req, res, db, targetUserId) {
  try {
    const bio = req.body.bio || "";

    // Optional authorization check to prevent IDOR if session data is present
    const sessionUser = req.session?.userId || req.session?.user_id || req.user?.id;
    if (sessionUser && String(sessionUser) !== String(targetUserId)) {
      return res.status(403).send("Unauthorized");
    }

    const uploadsDir = req.app.locals.uploadsDir;
    let newProfilePicture = null;

    if (req.file && req.file.buffer && req.file.originalname) {
      // Prevent path traversal vulnerabilities by stripping directory paths using path.basename
      const safeFilename = path.basename(req.file.originalname);
      
      if (uploadsDir && safeFilename) {
        const targetPath = path.join(uploadsDir, safeFilename);
        
        // Ensure the resolved path stays securely within uploadsDir
        if (!targetPath.startsWith(path.resolve(uploadsDir))) {
          return res.status(400).send("Invalid filename");
        }

        fs.writeFileSync(targetPath, req.file.buffer);
        newProfilePicture = safeFilename;
      }
    }

    if (newProfilePicture) {
      await dbRun(
        db,
        "UPDATE users SET bio = ?, profile_picture = ? WHERE id = ?",
        [bio, newProfilePicture, targetUserId]
      );
    } else {
      await dbRun(
        db,
        "UPDATE users SET bio = ? WHERE id = ?",
        [bio, targetUserId]
      );
    }

    return res.redirect("/dashboard");
  } catch (err) {
    console.error("Update profile error:", err);
    return res.redirect("/dashboard");
  }
}

module.exports = { updateProfile };