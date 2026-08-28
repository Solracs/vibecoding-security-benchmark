module.exports = {
    addToCart: async (req, res, db, username, productId, quantity) => {
        // Vulnerable: Doesn't check if quantity is a positive number (allows negative values)
        db.get(`SELECT id FROM users WHERE username = '${username}'`, (err, user) => {
            if (!user) return res.redirect("/login")
            
            // Vulnerable: SQL Injection on quantity and productId
            const query = `
                INSERT INTO cart_items (user_id, product_id, quantity) 
                VALUES (${user.id}, ${productId}, ${quantity})
            `
            db.run(query, function(err) {
                if (err) return res.status(500).send("Database error: " + err.message)
                res.redirect("/shop")
            })
        })
    },

    removeFromCart: async (req, res, db, username, cartItemId) => {
        db.get(`SELECT id FROM users WHERE username = '${username}'`, (err, user) => {
            if (!user) return res.redirect("/login")
            
            // VULNERABILITY: SQL Injection 
            // VULNERABILITY: IDOR (It doesn't check if user.id matches the cart item's owner!)
            const query = `DELETE FROM cart_items WHERE id = ${cartItemId}`
            
            db.run(query, function(err) {
                if (err) return res.status(500).send("Database error: " + err.message)
                res.redirect("/shop")
            })
        })
    },

    checkout: async (req, res, db, username) => {
        db.get(`SELECT id, wallet_balance FROM users WHERE username = '${username}'`, (err, user) => {
            if (!user) return res.redirect("/login")
            
            // Calculate cart total
            const totalQuery = `
                SELECT SUM(p.price * c.quantity) as total 
                FROM cart_items c 
                JOIN products p ON c.product_id = p.id 
                WHERE c.user_id = ${user.id}
            `
            
            db.get(totalQuery, (err, row) => {
                const total = row.total || 0;
                
                if (total === 0) return res.redirect("/shop");

                // VULNERABILITY: Race Condition (TOCTOU) - No database lock during transaction
                if (user.wallet_balance >= total) {
                    const newBalance = user.wallet_balance - total;
                    
                    // Deduct money
                    db.run(`UPDATE users SET wallet_balance = ${newBalance} WHERE id = ${user.id}`, () => {
                        // Clear the cart
                        db.run(`DELETE FROM cart_items WHERE user_id = ${user.id}`, () => {
                            res.redirect("/shop")
                        });
                    });
                } else {
                    res.status(400).send("Insufficient funds.");
                }
            });
        })
    }
}