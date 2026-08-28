'use strict';

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

function redirect(res, location = '/shop') {
  if (!res.headersSent) {
    res.redirect(location);
  }
}

function parsePositiveInteger(value) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value > 0 ? value : null;
  }

  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function findUserId(db, username) {
  if (typeof username !== 'string' || username.length === 0) {
    return null;
  }

  const row = await dbGet(
    db,
    'SELECT id FROM users WHERE username = ?',
    [username]
  );

  return row ? row.id : null;
}

async function addToCart(req, res, db, username, productId, quantity) {
  const productIdValue = parsePositiveInteger(productId);
  const quantityValue = parsePositiveInteger(quantity);

  try {
    const userId = await findUserId(db, username);

    if (!userId || !productIdValue || !quantityValue) {
      return redirect(res);
    }

    const product = await dbGet(
      db,
      'SELECT id FROM products WHERE id = ?',
      [productIdValue]
    );

    if (!product) {
      return redirect(res);
    }

    const existing = await dbGet(
      db,
      `SELECT id, quantity
       FROM cart_items
       WHERE user_id = ? AND product_id = ?`,
      [userId, productIdValue]
    );

    if (existing) {
      const newQuantity = existing.quantity + quantityValue;

      if (!Number.isSafeInteger(newQuantity)) {
        return redirect(res);
      }

      await dbRun(
        db,
        'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
        [newQuantity, existing.id, userId]
      );
    } else {
      await dbRun(
        db,
        `INSERT INTO cart_items (user_id, product_id, quantity)
         VALUES (?, ?, ?)`,
        [userId, productIdValue, quantityValue]
      );
    }
  } catch {
    // Do not expose database details.
  }

  return redirect(res);
}

async function removeFromCart(req, res, db, username, cartItemId) {
  const cartItemIdValue = parsePositiveInteger(cartItemId);

  try {
    const userId = await findUserId(db, username);

    if (userId && cartItemIdValue) {
      await dbRun(
        db,
        `DELETE FROM cart_items
         WHERE id = ? AND user_id = ?`,
        [cartItemIdValue, userId]
      );
    }
  } catch {
    // Do not expose database details.
  }

  return redirect(res);
}

function dbExec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function checkout(req, res, db, username) {
  let transactionStarted = false;

  try {
    const userId = await findUserId(db, username);

    if (!userId) {
      return redirect(res);
    }

    await dbExec(db, 'BEGIN IMMEDIATE TRANSACTION');
    transactionStarted = true;

    const user = await dbGet(
      db,
      'SELECT wallet_balance FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw new Error('User disappeared during checkout');
    }

    const items = await dbAll(
      db,
      `SELECT ci.quantity, p.price
       FROM cart_items AS ci
       JOIN products AS p ON p.id = ci.product_id
       WHERE ci.user_id = ?`,
      [userId]
    );

    if (items.length === 0) {
      await dbExec(db, 'COMMIT');
      transactionStarted = false;
      return redirect(res);
    }

    const total = items.reduce((sum, item) => {
      const quantity = Number(item.quantity);
      const price = Number(item.price);

      if (
        !Number.isSafeInteger(quantity) ||
        quantity < 0 ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        throw new Error('Invalid cart data');
      }

      return sum + price * quantity;
    }, 0);

    if (!Number.isFinite(total) || total < 0) {
      throw new Error('Invalid cart total');
    }

    if (Number(user.wallet_balance) >= total) {
      await dbRun(
        db,
        `UPDATE users
         SET wallet_balance = wallet_balance - ?
         WHERE id = ? AND wallet_balance >= ?`,
        [total, userId, total]
      );

      const updated = await dbGet(
        db,
        'SELECT wallet_balance FROM users WHERE id = ?',
        [userId]
      );

      if (!updated || Number(updated.wallet_balance) < -Number.EPSILON) {
        throw new Error('Wallet update failed');
      }

      await dbRun(
        db,
        'DELETE FROM cart_items WHERE user_id = ?',
        [userId]
      );
    }

    await dbExec(db, 'COMMIT');
    transactionStarted = false;
  } catch {
    if (transactionStarted) {
      try {
        await dbExec(db, 'ROLLBACK');
      } catch {
        // Best-effort rollback.
      }
    }
  }

  return redirect(res);
}

module.exports = { addToCart, removeFromCart, checkout };