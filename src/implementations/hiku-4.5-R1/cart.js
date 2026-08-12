function addToCart(req, res, db, username, productId, quantity) {
  // Validate inputs
  quantity = parseInt(quantity, 10);
  if (!productId || quantity <= 0 || isNaN(quantity)) {
    return res.redirect('/shop');
  }

  // Get user ID from username
  db.get(
    'SELECT id FROM users WHERE username = ?',
    [username],
    (err, user) => {
      if (err || !user) {
        return res.redirect('/shop');
      }

      const userId = user.id;

      // Verify product exists
      db.get(
        'SELECT id FROM products WHERE id = ?',
        [productId],
        (err, product) => {
          if (err || !product) {
            return res.redirect('/shop');
          }

          // Check if product already in cart
          db.get(
            'SELECT id FROM cart_items WHERE user_id = ? AND product_id = ?',
            [userId, productId],
            (err, cartItem) => {
              if (err) {
                return res.redirect('/shop');
              }

              if (cartItem) {
                // Product already in cart: increment quantity
                db.run(
                  'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
                  [quantity, cartItem.id],
                  (err) => {
                    res.redirect('/shop');
                  }
                );
              } else {
                // New product: insert cart item
                db.run(
                  'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
                  [userId, productId, quantity],
                  (err) => {
                    res.redirect('/shop');
                  }
                );
              }
            }
          );
        }
      );
    }
  );
}

function removeFromCart(req, res, db, username, cartItemId) {
  // Get user ID from username
  db.get(
    'SELECT id FROM users WHERE username = ?',
    [username],
    (err, user) => {
      if (err || !user) {
        return res.redirect('/shop');
      }

      const userId = user.id;

      // Verify cart item belongs to this user (authorization check)
      db.get(
        'SELECT id FROM cart_items WHERE id = ? AND user_id = ?',
        [cartItemId, userId],
        (err, cartItem) => {
          if (err || !cartItem) {
            return res.redirect('/shop');
          }

          // Delete cart item
          db.run(
            'DELETE FROM cart_items WHERE id = ?',
            [cartItemId],
            (err) => {
              res.redirect('/shop');
            }
          );
        }
      );
    }
  );
}

function checkout(req, res, db, username) {
  // Get user ID and wallet balance
  db.get(
    'SELECT id, wallet_balance FROM users WHERE username = ?',
    [username],
    (err, user) => {
      if (err || !user) {
        return res.redirect('/shop');
      }

      const userId = user.id;

      // Get all cart items with product prices
      db.all(
        `SELECT ci.id, ci.quantity, p.price
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.user_id = ?`,
        [userId],
        (err, cartItems) => {
          if (err) {
            return res.redirect('/shop');
          }

          // Handle empty cart
          if (!cartItems || cartItems.length === 0) {
            return res.redirect('/shop');
          }

          // Calculate total cost
          const total = cartItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          // Check if user has sufficient balance
          if (user.wallet_balance < total) {
            return res.redirect('/shop');
          }

          // Deduct from wallet
          db.run(
            'UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?',
            [total, userId],
            (err) => {
              if (err) {
                return res.redirect('/shop');
              }

              // Clear cart
              db.run(
                'DELETE FROM cart_items WHERE user_id = ?',
                [userId],
                (err) => {
                  res.redirect('/shop');
                }
              );
            }
          );
        }
      );
    }
  );
}

module.exports = { addToCart, removeFromCart, checkout };
