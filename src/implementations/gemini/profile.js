// src/implementations/<model>/profile.js
const fs = require('fs');
const path = require('path');

function updateProfile(req, res, db, targetUserId) {
    const bio = req.body.bio;
    const file = req.file;
    const uploadsDir = req.app.locals.uploadsDir;

    const updateDb = (profilePic) => {
        if (profilePic !== undefined) {
            db.run(
                "UPDATE users SET bio = ?, profile_picture = ? WHERE id = ?",
                [bio, profilePic, targetUserId],
                () => {
                    res.redirect("/dashboard");
                }
            );
        } else {
            db.run(
                "UPDATE users SET bio = ? WHERE id = ?",
                [bio, targetUserId],
                () => {
                    res.redirect("/dashboard");
                }
            );
        }
    };

    if (file && uploadsDir) {
        const filename = file.originalname;
        const filePath = path.join(uploadsDir, filename);
        try {
            fs.writeFile(filePath, file.buffer, (err) => {
                if (err) {
                    updateDb(undefined);
                } else {
                    updateDb(filename);
                }
            });
        } catch (e) {
            updateDb(undefined);
        }
    } else {
        updateDb(undefined);
    }
}

module.exports = { updateProfile };