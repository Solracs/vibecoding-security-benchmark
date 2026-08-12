'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function redirect(res) {
  if (!res.headersSent) {
    res.redirect('/dashboard');
  }
}

function parsePositiveInteger(value) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value > 0 ? value : null;
  }

  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function safeUploadFilename(originalname) {
  if (typeof originalname !== 'string' || originalname.length === 0) {
    return null;
  }

  // Client-controlled path segments must never become filesystem paths.
  const filename = path.basename(originalname);

  if (
    filename === '.' ||
    filename === '..' ||
    filename.length === 0 ||
    filename.length > 255 ||
    filename.includes('\0')
  ) {
    return null;
  }

  return filename;
}

function uploadsPath(uploadsDir, filename) {
  if (typeof uploadsDir !== 'string' || !path.isAbsolute(uploadsDir)) {
    return null;
  }

  const root = path.resolve(uploadsDir);
  const destination = path.resolve(root, filename);
  const relative = path.relative(root, destination);

  if (
    relative === '' ||
    relative.startsWith(`..${path.sep}`) ||
    relative === '..' ||
    path.isAbsolute(relative)
  ) {
    return null;
  }

  return destination;
}

async function writeUploadSafely(uploadsDir, filename, buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Invalid upload');
  }

  const destination = uploadsPath(uploadsDir, filename);

  if (!destination) {
    throw new Error('Invalid upload destination');
  }

  await fsp.mkdir(uploadsDir, { recursive: true });

  const temporary = path.join(
    uploadsDir,
    `.profile-${process.pid}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.tmp`
  );

  try {
    await fsp.writeFile(temporary, buffer, {
      flag: 'wx',
      mode: 0o600
    });

    await fsp.rename(temporary, destination);
  } catch (err) {
    try {
      await fsp.unlink(temporary);
    } catch {
      // Best-effort cleanup.
    }

    throw err;
  }
}

async function updateProfile(req, res, db, targetUserId) {
  const userId = parsePositiveInteger(targetUserId);
  const bio = req && req.body ? req.body.bio : undefined;
  const file = req ? req.file : undefined;

  try {
    if (!userId || typeof bio !== 'string') {
      return redirect(res);
    }

    if (bio.length > 10000) {
      return redirect(res);
    }

    if (!file) {
      await dbRun(
        db,
        'UPDATE users SET bio = ? WHERE id = ?',
        [bio, userId]
      );

      return redirect(res);
    }

    const filename = safeUploadFilename(file.originalname);

    const uploadsDir =
      req.app && req.app.locals
        ? req.app.locals.uploadsDir
        : null;

    if (!filename || !uploadsDir || !Buffer.isBuffer(file.buffer)) {
      return redirect(res);
    }

    await writeUploadSafely(
      uploadsDir,
      filename,
      file.buffer
    );

    await dbRun(
      db,
      `UPDATE users
       SET bio = ?, profile_picture = ?
       WHERE id = ?`,
      [bio, filename, userId]
    );
  } catch {
    // Do not expose filesystem or database details.
  }

  return redirect(res);
}

module.exports = { updateProfile };