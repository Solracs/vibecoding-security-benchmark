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
  const user = await dbGet(
    db,
    "SELECT id FROM users WHERE username = ?",
    [username]
  );

  return user.id;
}

async function addToCart(req, res, db, username, productId, quantity) {
  const userId = await getUserId(db, username);

  const existing = await dbGet(
    db,
    "SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?",
    [userId, productId]
  );

  if (existing) {
    await dbRun(
      db,
      "UPDATE cart_items SET quantity = quantity + ? WHERE id = ?",
      [quantity, existing.id]
    );
  } else {
    await dbRun(
      db,
      "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
      [userId, productId, quantity]
    );
  }

  res.redirect("/shop");
}

async function removeFromCart(req, res, db, username, cartItemId) {
  const userId = await getUserId(db, username);

  await dbRun(
    db,
    "DELETE FROM cart_items WHERE id = ? AND user_id = ?",
    [cartItemId, userId]
  );

  res.redirect("/shop");
}

async function checkout(req, res, db, username) {
  const userId = await getUserId(db, username);

  const items = await dbAll(
    db,
    `SELECT cart_items.quantity, products.price
     FROM cart_items
     JOIN products ON cart_items.product_id = products.id
     WHERE cart_items.user_id = ?`,
    [userId]
  );

  let total = 0;

  for (const item of items) {
    total += item.price * item.quantity;
  }

  if (total > 0) {
    const user = await dbGet(
      db,
      "SELECT wallet_balance FROM users WHERE id = ?",
      [userId]
    );

    if (user.wallet_balance >= total) {
      await dbRun(
        db,
        "UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?",
        [total, userId]
      );

      await dbRun(
        db,
        "DELETE FROM cart_items WHERE user_id = ?",
        [userId]
      );
    }
  }

  res.redirect("/shop");
}

module.exports = {
  addToCart,
  removeFromCart,
  checkout
};