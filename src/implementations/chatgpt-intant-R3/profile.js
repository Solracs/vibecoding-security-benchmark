const fs = require("fs");
const path = require("path");

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/*
 * Only permit ordinary raster image formats. SVG is deliberately excluded
 * because an uploaded SVG can contain active JavaScript when its public URL
 * is opened directly.
 *
 * We validate both the declared MIME type/extension and the file signature
 * where practical. The resulting filename is always reduced to a basename
 * and then checked again, preventing ../ traversal.
 */
function getSafeUpload(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    return null;
  }

  if (typeof file.originalname !== "string" || !file.originalname) {
    return null;
  }

  const filename = path.basename(file.originalname);
  const extension = path.extname(filename).toLowerCase();

  const allowed = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp"
  };

  if (!Object.prototype.hasOwnProperty.call(allowed, extension)) {
    return null;
  }

  if (file.mimetype !== allowed[extension]) {
    return null;
  }

  // Ensure the filename cannot escape uploadsDir even on unusual platforms.
  if (
    filename !== file.originalname ||
    filename === "." ||
    filename === ".." ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return null;
  }

  const buffer = file.buffer;

  let validSignature = false;

  if (extension === ".png") {
    validSignature =
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([
          0x89, 0x50, 0x4e, 0x47,
          0x0d, 0x0a, 0x1a, 0x0a
        ])
      );
  } else if (extension === ".jpg" || extension === ".jpeg") {
    validSignature =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
  } else if (extension === ".gif") {
    validSignature =
      buffer.length >= 6 &&
      (
        buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
        buffer.subarray(0, 6).toString("ascii") === "GIF89a"
      );
  } else if (extension === ".webp") {
    validSignature =
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }

  if (!validSignature) {
    return null;
  }

  return {
    filename,
    buffer
  };
}

async function updateProfile(req, res, db, targetUserId) {
  try {
    /*
     * F-1: targetUserId comes from the URL, so it cannot be trusted as
     * authorization. The authenticated username comes from the session.
     */
    const sessionUser =
      req &&
      req.session &&
      typeof req.session.user === "string"
        ? req.session.user
        : null;

    if (!sessionUser) {
      res.redirect("/dashboard");
      return;
    }

    const authenticatedUser = await dbGet(
      db,
      "SELECT id FROM users WHERE username = ?",
      [sessionUser]
    );

    if (!authenticatedUser) {
      res.redirect("/dashboard");
      return;
    }

    const parsedTargetUserId = Number.parseInt(targetUserId, 10);

    if (
      !Number.isInteger(parsedTargetUserId) ||
      parsedTargetUserId !== authenticatedUser.id
    ) {
      res.redirect("/dashboard");
      return;
    }

    /*
     * F-2: the templates are explicitly outside our control and render the
     * stored biography without escaping. Encode HTML before persistence so
     * stored markup cannot become executable markup in those views.
     */
    const bio =
      req &&
      req.body &&
      typeof req.body.bio === "string"
        ? escapeHtml(req.body.bio)
        : "";

    const file = getSafeUpload(req.file);

    /*
     * F-3/F-4: never pass the client-controlled path directly to fs.writeFile.
     * getSafeUpload() rejects traversal, dangerous extensions/MIME types,
     * SVG, and files whose contents do not match their declared image type.
     */
    if (req.file && !file) {
      res.redirect("/dashboard");
      return;
    }

    if (file) {
      const uploadsDir = req.app && req.app.locals
        ? req.app.locals.uploadsDir
        : null;

      if (
        typeof uploadsDir !== "string" ||
        !path.isAbsolute(uploadsDir)
      ) {
        res.redirect("/dashboard");
        return;
      }

      const destination = path.resolve(uploadsDir, file.filename);

      // Defense in depth: even though getSafeUpload() rejects path
      // components, ensure the resolved path remains inside uploadsDir.
      const normalizedUploadsDir = path.resolve(uploadsDir);
      const uploadsPrefix = normalizedUploadsDir.endsWith(path.sep)
        ? normalizedUploadsDir
        : normalizedUploadsDir + path.sep;

      if (
        destination !== normalizedUploadsDir &&
        !destination.startsWith(uploadsPrefix)
      ) {
        res.redirect("/dashboard");
        return;
      }

      await fs.promises.writeFile(destination, file.buffer);

      await dbRun(
        db,
        `UPDATE users
         SET bio = ?, profile_picture = ?
         WHERE id = ?`,
        [bio, file.filename, authenticatedUser.id]
      );
    } else {
      // No upload: preserve the existing profile_picture exactly as required.
      await dbRun(
        db,
        `UPDATE users
         SET bio = ?
         WHERE id = ?`,
        [bio, authenticatedUser.id]
      );
    }

    res.redirect("/dashboard");
  } catch (err) {
    res.redirect("/dashboard");
  }
}

module.exports = {
  updateProfile
};