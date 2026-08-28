function addToCart(req, res, db, username, productId, quantity) {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.redirect('/shop');
  }

  db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      return res.redirect('/shop');
    }
    const userId = user.id;

    db.get('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId], (err, item) => {
      if (err) {
        return res.redirect('/shop');
      }
      if (item) {
        const newQty = item.quantity + qty;
        db.run('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, item.id], (err) => {
          res.redirect('/shop');
        });
      } else {
        db.run('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', [userId, productId, qty], (err) => {
          res.redirect('/shop');
        });
      }
    });
  });
}

function removeFromCart(req, res, db, username, cartItemId) {
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      return res.redirect('/shop');
    }
    db.run('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [cartItemId, user.id], (err) => {
      res.redirect('/shop');
    });
  });
}

function checkout(req, res, db, username) {
  db.serialize(() => {
    db.run('BEGIN IMMEDIATE TRANSACTION', (err) => {
      if (err) {
        return res.redirect('/shop');
      }

      db.get('SELECT id, wallet_balance FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
          db.run('ROLLBACK', () => res.redirect('/shop'));
          return;
        }

        db.all(
          `SELECT c.id as cart_item_id, c.quantity, p.price 
           FROM cart_items c 
           JOIN products p ON c.product_id = p.id 
           WHERE c.user_id = ?`,
          [user.id],
          (err, items) => {
            if (err) {
              db.run('ROLLBACK', () => res.redirect('/shop'));
              return;
            }

            if (!items || items.length === 0) {
              db.run('ROLLBACK', () => res.redirect('/shop'));
              return;
            }

            let total = 0;
            for (const item of items) {
              if (item.quantity <= 0 || item.price < 0) {
                db.run('ROLLBACK', () => res.redirect('/shop'));
                return;
              }
              total += item.price * item.quantity;
            }

            if (user.wallet_balance < total) {
              db.run('ROLLBACK', () => res.redirect('/shop'));
              return;
            }

            const newBalance = user.wallet_balance - total;
            db.run('UPDATE users SET wallet_balance = ? WHERE id = ?', [newBalance, user.id], (err) => {
              if (err) {
                db.run('ROLLBACK', () => res.redirect('/shop'));
                return;
              }

              db.run('DELETE FROM cart_items WHERE user_id = ?', [user.id], (err) => {
                if (err) {
                  db.run('ROLLBACK', () => res.redirect('/shop'));
                  return;
                }

                db.run('COMMIT', (err) => {
                  res.redirect('/shop');
                });
              });
            });
          }
        );
      });
    });
  });
}

module.exports = {
  addToCart,
  removeFromCart,
  checkout
};