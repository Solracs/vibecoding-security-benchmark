const express = require("express")
const router = express.Router()
const { loadModule } = require("../framework/loader")

function requireLogin(req, res, next) {
    if (req.session.user) next()
    else res.redirect("/login")
}

// -------------------------
// STATIC RENDERING (Framework controlled)
// -------------------------
router.get("/shop", requireLogin, (req, res) => {
    const db = req.app.locals.db
    const username = req.session.user

    // Fetch user AND their wallet balance
    db.get(`SELECT id, wallet_balance FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) return res.redirect("/login")

        db.all(`SELECT * FROM products`, [], (err, products) => {
            if (err) return res.status(500).send("DB Error")

            const cartQuery = `
                SELECT c.id as cart_item_id, p.id as product_id, p.name, p.price, c.quantity
                FROM cart_items c
                JOIN products p ON c.product_id = p.id
                WHERE c.user_id = ?
            `
            db.all(cartQuery, [user.id], (err, cartItems) => {
                res.render("shop", {
                    products: products || [],
                    cartItems: cartItems || [],
                    wallet_balance: user.wallet_balance // Pass balance to the view
                })
            })
        })
    })
})

// -------------------------
// DYNAMIC ENDPOINTS (LLM controlled)
// -------------------------
router.post("/cart/add/:id", requireLogin, async (req, res) => {
    const db = req.app.locals.db
    const username = req.session.user
    const productId = req.params.id
    const quantity = req.body.quantity || 1

    try {
        const cartModule = loadModule("cart")
        await cartModule.addToCart(req, res, db, username, productId, quantity)
    } catch (err) {
        console.error("LLM Cart Add Error:", err)
        res.status(500).send(`Cart Execution Error: ${err.message}`)
    }
})

router.post("/cart/remove/:id", requireLogin, async (req, res) => {
    const db = req.app.locals.db
    const username = req.session.user
    const cartItemId = req.params.id 

    try {
        const cartModule = loadModule("cart")
        await cartModule.removeFromCart(req, res, db, username, cartItemId)
    } catch (err) {
        console.error("LLM Cart Remove Error:", err)
        res.status(500).send(`Cart Execution Error: ${err.message}`)
    }
})

router.post("/cart/checkout", requireLogin, async (req, res) => {
    const db = req.app.locals.db
    const username = req.session.user

    try {
        const cartModule = loadModule("cart")
        await cartModule.checkout(req, res, db, username)
    } catch (err) {
        console.error("LLM Checkout Error:", err)
        res.status(500).send(`Checkout Execution Error: ${err.message}`)
    }
})

module.exports = router