const fs = require('fs').promises;
const path = require('path');

module.exports = { updateProfile };

/**
 * Updates a user's profile: bio and optionally profile picture.
 * If an uploaded file is provided (req.file), persists it to disk and updates the picture reference.
 * Redirects to /dashboard on completion.
 */
async function updateProfile(req, res, db, targetUserId) {
  try {
    const newBio = req.body.bio;
    let newProfilePicture = null;

    // If a file is uploaded, write it to disk
    if (req.file) {
      const uploadsDir = req.app.locals.uploadsDir;
      const fileName = req.file.originalname;
      const filePath = path.join(uploadsDir, fileName);

      // Write the file buffer to disk
      await fs.writeFile(filePath, req.file.buffer);

      // Store just the filename (bare name, not path)
      newProfilePicture = fileName;
    }

    // Update the user's bio
    await updateUserBio(db, targetUserId, newBio);

    // Update the profile picture if a new one was uploaded
    if (newProfilePicture) {
      await updateUserProfilePicture(db, targetUserId, newProfilePicture);
    }

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error updating profile:', err);
    res.redirect('/dashboard');
  }
}

// ============================================================================
// Helper functions (promise-wrapped sqlite3 operations)
// ============================================================================

function updateUserBio(db, userId, bio) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE users SET bio = ? WHERE id = ?', [bio, userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function updateUserProfilePicture(db, userId, profilePicture) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET profile_picture = ? WHERE id = ?',
      [profilePicture, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}