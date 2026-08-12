module.exports = { addToCart, removeFromCart, checkout };

/**
 * Adds a product to the user's cart, or increments its quantity if already present.
 * Redirects to /shop on completion.
 */
async function addToCart(req, res, db, username, productId, quantity) {
  try {
    // Resolve username to user_id
    const userId = await getUserId(db, username);
    if (!userId) {
      return res.redirect('/shop');
    }

    // Check if product already in cart
    const existingItem = await getCartItem(db, userId, productId);

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      await updateCartQuantity(db, existingItem.id, newQuantity);
    } else {
      // Insert new cart item
      await insertCartItem(db, userId, productId, quantity);
    }

    res.redirect('/shop');
  } catch (err) {
    console.error('Error adding to cart:', err);
    res.redirect('/shop');
  }
}

/**
 * Removes a cart item from the user's cart.
 * Redirects to /shop on completion.
 */
async function removeFromCart(req, res, db, username, cartItemId) {
  try {
    await deleteCartItem(db, cartItemId);
    res.redirect('/shop');
  } catch (err) {
    console.error('Error removing from cart:', err);
    res.redirect('/shop');
  }
}

/**
 * Processes checkout: deducts total from wallet if sufficient balance exists,
 * clears the cart, and redirects to /shop.
 */
async function checkout(req, res, db, username) {
  try {
    // Resolve username to user_id
    const userId = await getUserId(db, username);
    if (!userId) {
      return res.redirect('/shop');
    }

    // Get user's current wallet balance
    const user = await getUser(db, userId);
    if (!user) {
      return res.redirect('/shop');
    }

    // Calculate cart total
    const cartTotal = await calculateCartTotal(db, userId);

    // If balance is sufficient, process the purchase
    if (user.wallet_balance >= cartTotal) {
      const newBalance = user.wallet_balance - cartTotal;
      await updateWalletBalance(db, userId, newBalance);
      await clearCart(db, userId);
    }
    // If balance is insufficient, cart and wallet remain unchanged

    res.redirect('/shop');
  } catch (err) {
    console.error('Error during checkout:', err);
    res.redirect('/shop');
  }
}

// ============================================================================
// Helper functions (promise-wrapped sqlite3 operations)
// ============================================================================

function getUserId(db, username) {
  return new Promise((resolve) => {
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
      resolve(row ? row.id : null);
    });
  });
}

function getUser(db, userId) {
  return new Promise((resolve) => {
    db.get(
      'SELECT id, wallet_balance FROM users WHERE id = ?',
      [userId],
      (err, row) => {
        resolve(row || null);
      }
    );
  });
}

function getCartItem(db, userId, productId) {
  return new Promise((resolve) => {
    db.get(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      [userId, productId],
      (err, row) => {
        resolve(row || null);
      }
    );
  });
}

function insertCartItem(db, userId, productId, quantity) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
      [userId, productId, quantity],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function updateCartQuantity(db, cartItemId, newQuantity) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE cart_items SET quantity = ? WHERE id = ?',
      [newQuantity, cartItemId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function deleteCartItem(db, cartItemId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM cart_items WHERE id = ?', [cartItemId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function calculateCartTotal(db, userId) {
  return new Promise((resolve) => {
    db.get(
      `SELECT SUM(p.price * c.quantity) as total
       FROM cart_items c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = ?`,
      [userId],
      (err, row) => {
        // If cart is empty, row.total will be null
        resolve(row && row.total ? row.total : 0);
      }
    );
  });
}

function updateWalletBalance(db, userId, newBalance) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET wallet_balance = ? WHERE id = ?',
      [newBalance, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function clearCart(db, userId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM cart_items WHERE user_id = ?', [userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}