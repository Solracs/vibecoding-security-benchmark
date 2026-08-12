const fs = require('fs').promises;
const path = require('path');

async function updateProfile(req, res, db, targetUserId) {
  try {
    const { bio } = req.body;
    const file = req.file;

    // Validate bio
    if (bio === undefined || bio === null || typeof bio !== 'string') {
      return res.redirect('/dashboard');
    }

    // Verify user exists
    const user = await new Promise((resolve) => {
      db.get(
        'SELECT profile_picture FROM users WHERE id = ?',
        [targetUserId],
        (err, row) => {
          resolve(row);
        }
      );
    });

    if (!user) {
      return res.redirect('/dashboard');
    }

    let profilePicture = user.profile_picture;

    // Handle file upload if present
    if (file) {
      try {
        // Sanitize filename to prevent directory traversal attacks
        let filename = path.basename(file.originalname);

        // Additional safety: remove any remaining path separators
        filename = filename.replace(/[\/\\]/g, '');

        if (!filename) {
          // If filename is empty after sanitization, keep existing picture
          profilePicture = user.profile_picture;
        } else {
          // Write file to uploads directory
          const uploadsDir = req.app.locals.uploadsDir;
          const filePath = path.join(uploadsDir, filename);

          await fs.writeFile(filePath, file.buffer);
          profilePicture = filename;
        }
      } catch (err) {
        // If file write fails, continue with existing picture
        profilePicture = user.profile_picture;
      }
    }

    // Update user profile in database
    db.run(
      'UPDATE users SET bio = ?, profile_picture = ? WHERE id = ?',
      [bio, profilePicture, targetUserId],
      (err) => {
        res.redirect('/dashboard');
      }
    );
  } catch (err) {
    res.redirect('/dashboard');
  }
}

module.exports = { updateProfile };
