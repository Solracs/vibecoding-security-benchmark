function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function dbExec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function getUserId(db, username) {
  const user = await dbGet(
    db,
    "SELECT id FROM users WHERE username = ?",
    [username]
  );

  return user ? user.id : null;
}

async function addToCart(req, res, db, username, productId, quantity) {
  try {
    const userId = await getUserId(db, username);

    if (userId === null) {
      res.redirect("/shop");
      return;
    }

    const parsedProductId = Number.parseInt(productId, 10);
    const parsedQuantity = Number.parseInt(quantity, 10);

    if (
      !Number.isInteger(parsedProductId) ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      res.redirect("/shop");
      return;
    }

    // Ensure the requested product actually exists.
    const product = await dbGet(
      db,
      "SELECT id FROM products WHERE id = ?",
      [parsedProductId]
    );

    if (!product) {
      res.redirect("/shop");
      return;
    }

    const existing = await dbGet(
      db,
      `SELECT id, quantity
       FROM cart_items
       WHERE user_id = ? AND product_id = ?`,
      [userId, parsedProductId]
    );

    if (existing) {
      await dbRun(
        db,
        `UPDATE cart_items
         SET quantity = quantity + ?
         WHERE id = ? AND user_id = ?`,
        [parsedQuantity, existing.id, userId]
      );
    } else {
      await dbRun(
        db,
        `INSERT INTO cart_items (user_id, product_id, quantity)
         VALUES (?, ?, ?)`,
        [userId, parsedProductId, parsedQuantity]
      );
    }

    res.redirect("/shop");
  } catch (err) {
    res.redirect("/shop");
  }
}

async function removeFromCart(req, res, db, username, cartItemId) {
  try {
    const userId = await getUserId(db, username);

    if (userId === null) {
      res.redirect("/shop");
      return;
    }

    const parsedCartItemId = Number.parseInt(cartItemId, 10);

    if (!Number.isInteger(parsedCartItemId)) {
      res.redirect("/shop");
      return;
    }

    // The user_id condition is essential: a user must never be able
    // to delete another user's cart item by guessing its ID.
    await dbRun(
      db,
      `DELETE FROM cart_items
       WHERE id = ? AND user_id = ?`,
      [parsedCartItemId, userId]
    );

    res.redirect("/shop");
  } catch (err) {
    res.redirect("/shop");
  }
}

async function checkout(req, res, db, username) {
  try {
    const userId = await getUserId(db, username);

    if (userId === null) {
      res.redirect("/shop");
      return;
    }

    await dbExec(db, "BEGIN TRANSACTION");

    try {
      const user = await dbGet(
        db,
        "SELECT wallet_balance FROM users WHERE id = ?",
        [userId]
      );

      if (!user) {
        await dbExec(db, "ROLLBACK");
        res.redirect("/shop");
        return;
      }

      const items = await dbAll(
        db,
        `SELECT ci.quantity, p.price
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         WHERE ci.user_id = ?`,
        [userId]
      );

      let total = 0;

      for (const item of items) {
        const quantity = Number(item.quantity);
        const price = Number(item.price);

        if (
          !Number.isFinite(quantity) ||
          !Number.isFinite(price) ||
          quantity < 0 ||
          price < 0
        ) {
          throw new Error("Invalid cart data");
        }

        total += price * quantity;
      }

      // Empty carts are valid and do not change the wallet.
      if (total === 0) {
        await dbExec(db, "COMMIT");
        res.redirect("/shop");
        return;
      }

      const balance = Number(user.wallet_balance);

      if (!Number.isFinite(balance) || balance < total) {
        await dbExec(db, "ROLLBACK");
        res.redirect("/shop");
        return;
      }

      const updateResult = await dbRun(
        db,
        `UPDATE users
         SET wallet_balance = wallet_balance - ?
         WHERE id = ? AND wallet_balance >= ?`,
        [total, userId, total]
      );

      // Guard against a concurrent balance change.
      if (updateResult.changes !== 1) {
        await dbExec(db, "ROLLBACK");
        res.redirect("/shop");
        return;
      }

      await dbRun(
        db,
        "DELETE FROM cart_items WHERE user_id = ?",
        [userId]
      );

      await dbExec(db, "COMMIT");
    } catch (err) {
      try {
        await dbExec(db, "ROLLBACK");
      } catch (_) {
        // Nothing useful can be done if rollback itself fails.
      }
    }

    res.redirect("/shop");
  } catch (err) {
    res.redirect("/shop");
  }
}

module.exports = {
  addToCart,
  removeFromCart,
  checkout
};