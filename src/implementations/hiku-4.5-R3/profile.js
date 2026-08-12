const path = require('path');
const fs = require('fs');

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

// HTML escape function to prevent XSS (F-2)
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Sanitize filename to prevent path traversal (F-3)
function sanitizeFilename(filename) {
  // Remove path separators and traversal sequences
  return filename
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .replace(/^\.+/, '');
}

// Validate file type to prevent dangerous uploads (F-4)
function isAllowedFileType(filename, mimetype) {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const ext = path.extname(filename).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return false;
  }

  // Validate mimetype against whitelist
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
  if (!allowedMimes.includes(mimetype)) {
    return false;
  }

  return true;
}

async function updateProfile(req, res, db, targetUserId) {
  try {
    // F-1: Verify that authenticated user owns the profile being updated
    const authenticatedUsername = req.session.user;
    if (!authenticatedUsername) {
      return res.redirect('/dashboard');
    }

    // Get authenticated user's ID
    const authUser = await promisifyDbGet(
      db,
      'SELECT id FROM users WHERE username = ?',
      [authenticatedUsername]
    );

    if (!authUser) {
      return res.redirect('/dashboard');
    }

    // Verify ownership: authenticated user can only update their own profile
    if (parseInt(targetUserId) !== authUser.id) {
      return res.redirect('/dashboard');
    }

    // Get the target user to preserve existing profile_picture if needed
    const targetUser = await promisifyDbGet(
      db,
      'SELECT * FROM users WHERE id = ?',
      [targetUserId]
    );

    if (!targetUser) {
      return res.redirect('/dashboard');
    }

    let newProfilePicture = targetUser.profile_picture;

    // Handle file upload if present
    if (req.file) {
      // F-3: Sanitize filename to prevent path traversal
      const sanitizedName = sanitizeFilename(req.file.originalname);

      if (!sanitizedName) {
        return res.redirect('/dashboard');
      }

      // F-4: Validate file type before accepting upload
      if (!isAllowedFileType(sanitizedName, req.file.mimetype)) {
        return res.redirect('/dashboard');
      }

      // Write file to uploads directory
      const uploadsDir = req.app.locals.uploadsDir;
      const filePath = path.join(uploadsDir, sanitizedName);

      // Additional safety check: ensure resolved path is still within uploads directory
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadsDir = path.resolve(uploadsDir);
      if (!resolvedPath.startsWith(resolvedUploadsDir + path.sep) && resolvedPath !== resolvedUploadsDir) {
        return res.redirect('/dashboard');
      }

      fs.writeFileSync(filePath, req.file.buffer);
      newProfilePicture = sanitizedName;
    }

    // F-2: HTML escape the bio to prevent stored XSS
    // Escaping prevents script execution even if template renders without escaping
    const escapedBio = escapeHtml(req.body.bio || '');

    // Update the profile
    await promisifyDbRun(
      db,
      'UPDATE users SET bio = ?, profile_picture = ? WHERE id = ?',
      [escapedBio, newProfilePicture, targetUserId]
    );

    res.redirect('/dashboard');
  } catch (err) {
    res.redirect('/dashboard');
  }
}

module.exports = { updateProfile };
