module.exports = {
    async login(username, password, db) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`
            
            db.get(query, (err, row) => {
                if (err) return reject(err)
                resolve({ success: !!row })
            })
        })
    }
}