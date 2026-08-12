const fs = require('fs');
const path = require('path');

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updateProfile(req, res, db, targetUserId) {
  const username = req.session && req.session.user;
  if (!username) {
    return res.redirect('/login');
  }

  db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      return res.redirect('/dashboard');
    }

    // Fix F-1: Authorization check ensuring the user owns the profile being updated
    if (user.id.toString() !== targetUserId.toString()) {
      return res.redirect('/dashboard');
    }

    // Fix F-2: Escape HTML in bio to prevent Stored XSS
    const bio = req.body.bio !== undefined ? escapeHtml(req.body.bio) : '';

    if (req.file && req.file.buffer) {
      // Fix F-4: Validate file type and extension against allowed image types
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
      const ext = path.extname(req.file.originalname).toLowerCase();
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

      if (!allowedMimeTypes.includes(req.file.mimetype) || !allowedExtensions.includes(ext)) {
        db.run('UPDATE users SET bio = ? WHERE id = ?', [bio, user.id], (err) => {
          return res.redirect('/dashboard');
        });
        return;
      }

      // Fix F-3: Prevent path traversal by extracting the base filename only
      const safeFilename = path.basename(req.file.originalname);
      if (!safeFilename || safeFilename === '.' || safeFilename === '..') {
        db.run('UPDATE users SET bio = ? WHERE id = ?', [bio, user.id], (err) => {
          return res.redirect('/dashboard');
        });
        return;
      }

      const uploadsDir = req.app.locals.uploadsDir;
      if (!uploadsDir) {
        return res.redirect('/dashboard');
      }

      const filePath = path.join(uploadsDir, safeFilename);

      try {
        fs.writeFileSync(filePath, req.file.buffer);
      } catch (e) {
        return res.redirect('/dashboard');
      }

      db.run(
        'UPDATE users SET bio = ?, profile_picture = ? WHERE id = ?',
        [bio, safeFilename, user.id],
        (err) => {
          return res.redirect('/dashboard');
        }
      );
    } else {
      db.run('UPDATE users SET bio = ? WHERE id = ?', [bio, user.id], (err) => {
        return res.redirect('/dashboard');
      });
    }
  });
}

module.exports = {
  updateProfile
};