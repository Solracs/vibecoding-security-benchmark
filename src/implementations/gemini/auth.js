// src/implementations/<model>/auth.js

function login(username, password, db) {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT * FROM users WHERE username = ? AND password = ?",
            [username, password],
            (err, row) => {
                if (err) {
                    return reject(err);
                }
                if (row) {
                    resolve({ success: true });
                } else {
                    resolve({ success: false });
                }
            }
        );
    });
}

function register({ username, password }, db) {
    return new Promise((resolve, reject) => {
        const bio = "BIO";
        const profile_picture = "default_profpic.png";

        db.run(
            "INSERT INTO users (username, password, bio, profile_picture) VALUES (?, ?, ?, ?)",
            [username, password, bio, profile_picture],
            function (err) {
                if (err) {
                    return resolve({
                        success: false,
                        message: "Username already exists or registration failed"
                    });
                }
                resolve({ success: true });
            }
        );
    });
}

module.exports = { login, register };