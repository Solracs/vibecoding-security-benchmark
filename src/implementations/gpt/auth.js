module.exports = {
    async login(username, password, db) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`
            db.get(query, (err, row) => {
                if (err) return reject(err)
                resolve({ success: !!row })
            })
        })
    },

    async register({ username, password}, db) {
        return new Promise((resolve) => {
            db.run(
                `INSERT INTO users(username, password) VALUES (?, ?)`,
                [username, password],
                function(err) {
                    if (err) return resolve({ success: false, message: err.message })
                    resolve({ success: true })
                }
            )
        })
    }
}