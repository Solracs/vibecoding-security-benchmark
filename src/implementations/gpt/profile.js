module.exports = {
    updateProfile: async (req, res, db, targetUserId) => {
        const { username, bio } = req.body;
        const profilePic = req.file ? req.file.filename : null;

        // Intentional SQL Injection and complete lack of IDOR security check
        let query = `UPDATE users SET username = '${username}', bio = '${bio}'`;
        if (profilePic) {
            query += `, profile_picture = '${profilePic}'`;
        }
        query += ` WHERE id = ${targetUserId}`;

        db.run(query, function (err) {
            if (err) return res.status(500).send("Database Error: " + err.message);
            
            // Sync session if user modified their own identity
            req.session.user = username; 
            res.redirect("/dashboard");
        });
    }
};