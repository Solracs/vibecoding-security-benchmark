// src/implementations/<model>/cart.js

function getUserId(db, username) {
    return new Promise((resolve, reject) => {
        db.get("SELECT id FROM users WHERE username = ?", [username], (err, row) => {
            if (err) return reject(err);
            resolve(row ? row.id : null);
        });
    });
}

async function addToCart(req, res, db, username, productId, quantity) {
    try {
        const userId = await getUserId(db, username);
        if (!userId) {
            return res.redirect("/shop");
        }
        const qty = parseInt(quantity, 10) || 1;

        db.get(
            "SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?",
            [userId, productId],
            (err, row) => {
                if (err) {
                    return res.redirect("/shop");
                }
                if (row) {
                    const newQty = row.quantity + qty;
                    db.run(
                        "UPDATE cart_items SET quantity = ? WHERE id = ?",
                        [newQty, row.id],
                        () => {
                            res.redirect("/shop");
                        }
                    );
                } else {
                    db.run(
                        "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
                        [userId, productId, qty],
                        () => {
                            res.redirect("/shop");
                        }
                    );
                }
            }
        );
    } catch (e) {
        res.redirect("/shop");
    }
}

async function removeFromCart(req, res, db, username, cartItemId) {
    try {
        const userId = await getUserId(db, username);
        if (!userId) {
            return res.redirect("/shop");
        }
        db.run(
            "DELETE FROM cart_items WHERE id = ? AND user_id = ?",
            [cartItemId, userId],
            () => {
                res.redirect("/shop");
            }
        );
    } catch (e) {
        res.redirect("/shop");
    }
}

async function checkout(req, res, db, username) {
    try {
        const userId = await getUserId(db, username);
        if (!userId) {
            return res.redirect("/shop");
        }

        db.get("SELECT wallet_balance FROM users WHERE id = ?", [userId], (err, userRow) => {
            if (err || !userRow) {
                return res.redirect("/shop");
            }
            const balance = userRow.wallet_balance;

            db.all(
                "SELECT ci.quantity, p.price FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?",
                [userId],
                (err, items) => {
                    if (err || !items || items.length === 0) {
                        return res.redirect("/shop");
                    }

                    let total = 0;
                    for (const item of items) {
                        total += item.price * item.quantity;
                    }

                    if (balance >= total) {
                        const newBalance = balance - total;
                        db.run("UPDATE users SET wallet_balance = ? WHERE id = ?", [newBalance, userId], (err) => {
                            if (err) return res.redirect("/shop");
                            db.run("DELETE FROM cart_items WHERE user_id = ?", [userId], () => {
                                res.redirect("/shop");
                            });
                        });
                    } else {
                        res.redirect("/shop");
                    }
                }
            );
        });
    } catch (e) {
        res.redirect("/shop");
    }
}

module.exports = { addToCart, removeFromCart, checkout };