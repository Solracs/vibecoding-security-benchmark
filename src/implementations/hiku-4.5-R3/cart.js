function promisifyDbGet(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function promisifyDbAll(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function promisifyDbRun(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function addToCart(req, res, db, username, productId, quantity) {
  try {
    // F-5: Validate quantity is positive
    quantity = parseInt(quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.redirect('/shop');
    }

    // Get user ID
    const user = await promisifyDbGet(db, 'SELECT id FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.redirect('/shop');
    }

    // Check if product already in cart
    const existing = await promisifyDbGet(
      db,
      'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
      [user.id, productId]
    );

    if (existing) {
      // Update quantity
      await promisifyDbRun(
        db,
        'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
        [quantity, existing.id]
      );
    } else {
      // Insert new cart item
      await promisifyDbRun(
        db,
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [user.id, productId, quantity]
      );
    }

    res.redirect('/shop');
  } catch (err) {
    res.redirect('/shop');
  }
}

async function removeFromCart(req, res, db, username, cartItemId) {
  try {
    // Get user ID
    const user = await promisifyDbGet(db, 'SELECT id FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.redirect('/shop');
    }

    // F-7: Verify cart item belongs to this user before deleting
    const cartItem = await promisifyDbGet(
      db,
      'SELECT * FROM cart_items WHERE id = ? AND user_id = ?',
      [cartItemId, user.id]
    );

    if (!cartItem) {
      return res.redirect('/shop');
    }

    // Delete the cart item
    await promisifyDbRun(db, 'DELETE FROM cart_items WHERE id = ?', [cartItemId]);

    res.redirect('/shop');
  } catch (err) {
    res.redirect('/shop');
  }
}

async function checkout(req, res, db, username) {
  try {
    // Get user ID and current balance
    const user = await promisifyDbGet(db, 'SELECT id, wallet_balance FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.redirect('/shop');
    }

    // Get all cart items for this user with product prices
    const cartItems = await promisifyDbAll(
      db,
      `SELECT ci.id, ci.quantity, p.price
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ?`,
      [user.id]
    );

    // Calculate total
    let total = 0;
    for (const item of cartItems) {
      // F-5: Ensure quantities are positive (prevent negative totals)
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        return res.redirect('/shop');
      }
      total += item.price * item.quantity;
    }

    // Ensure total is not negative or invalid
    if (!Number.isFinite(total) || total < 0) {
      return res.redirect('/shop');
    }

    // Check if balance is sufficient
    if (user.wallet_balance < total) {
      return res.redirect('/shop');
    }

    // F-6: Use atomic transaction to prevent race condition
    // BEGIN IMMEDIATE acquires an exclusive lock immediately
    await promisifyDbRun(db, 'BEGIN IMMEDIATE', []);

    try {
      // Re-read balance inside transaction to ensure consistency
      const userInTx = await promisifyDbGet(db, 'SELECT wallet_balance FROM users WHERE id = ?', [user.id]);
      if (!userInTx || userInTx.wallet_balance < total) {
        await promisifyDbRun(db, 'ROLLBACK', []);
        return res.redirect('/shop');
      }

      // Deduct from wallet
      const newBalance = userInTx.wallet_balance - total;
      await promisifyDbRun(
        db,
        'UPDATE users SET wallet_balance = ? WHERE id = ?',
        [newBalance, user.id]
      );

      // Delete all cart items
      await promisifyDbRun(db, 'DELETE FROM cart_items WHERE user_id = ?', [user.id]);

      // Commit transaction
      await promisifyDbRun(db, 'COMMIT', []);
    } catch (err) {
      try {
        await promisifyDbRun(db, 'ROLLBACK', []);
      } catch (rollbackErr) {
        // Ignore rollback errors
      }
      throw err;
    }

    res.redirect('/shop');
  } catch (err) {
    res.redirect('/shop');
  }
}

module.exports = { addToCart, removeFromCart, checkout };
