function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function getUserId(db, username) {
  const user = await dbGet(db, "SELECT id FROM users WHERE username = ?", [username]);
  return user ? user.id : null;
}

async function addToCart(req, res, db, username, productId, quantity) {
  try {
    const userId = await getUserId(db, username);
    if (!userId) {
      return res.redirect("/shop");
    }

    const qty = parseInt(quantity, 10) || 1;

    const existingItem = await dbGet(
      db,
      "SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?",
      [userId, productId]
    );

    if (existingItem) {
      await dbRun(
        db,
        "UPDATE cart_items SET quantity = quantity + ? WHERE id = ?",
        [qty, existingItem.id]
      );
    } else {
      await dbRun(
        db,
        "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
        [userId, productId, qty]
      );
    }

    return res.redirect("/shop");
  } catch (err) {
    console.error("Add to cart error:", err);
    return res.redirect("/shop");
  }
}

async function removeFromCart(req, res, db, username, cartItemId) {
  try {
    const userId = await getUserId(db, username);
    if (!userId) {
      return res.redirect("/shop");
    }

    // Ensure the cart item belongs to the user to prevent IDOR vulnerabilities
    await dbRun(
      db,
      "DELETE FROM cart_items WHERE id = ? AND user_id = ?",
      [cartItemId, userId]
    );

    return res.redirect("/shop");
  } catch (err) {
    console.error("Remove from cart error:", err);
    return res.redirect("/shop");
  }
}

async function checkout(req, res, db, username) {
  try {
    const userId = await getUserId(db, username);
    if (!userId) {
      return res.redirect("/shop");
    }

    // Use a transaction to ensure atomicity and prevent concurrency race conditions during checkout
    await dbRun(db, "BEGIN TRANSACTION");

    try {
      const user = await dbGet(db, "SELECT wallet_balance FROM users WHERE id = ?", [userId]);
      if (!user) {
        await dbRun(db, "ROLLBACK");
        return res.redirect("/shop");
      }

      const cartItems = await dbAll(
        db,
        `SELECT ci.id, ci.quantity, p.price 
         FROM cart_items ci 
         JOIN products p ON ci.product_id = p.id 
         WHERE ci.user_id = ?`,
        [userId]
      );

      if (!cartItems || cartItems.length === 0) {
        await dbRun(db, "ROLLBACK");
        return res.redirect("/shop");
      }

      let totalCost = 0;
      for (const item of cartItems) {
        totalCost += item.price * item.quantity;
      }

      if (user.wallet_balance >= totalCost) {
        await dbRun(
          db,
          "UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?",
          [totalCost, userId]
        );

        await dbRun(
          db,
          "DELETE FROM cart_items WHERE user_id = ?",
          [userId]
        );

        await dbRun(db, "COMMIT");
      } else {
        await dbRun(db, "ROLLBACK");
      }

      return res.redirect("/shop");
    } catch (innerErr) {
      await dbRun(db, "ROLLBACK");
      throw innerErr;
    }
  } catch (err) {
    console.error("Checkout error:", err);
    return res.redirect("/shop");
  }
}

module.exports = { addToCart, removeFromCart, checkout };