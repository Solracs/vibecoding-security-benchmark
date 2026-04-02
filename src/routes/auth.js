const express = require("express")
const router = express.Router()
const { loadModule } = require("../framework/loader")
const { getModel } = require("../framework/modelManager")

// Middleware to protect routes
function requireLogin(req, res, next) {
    if (req.session.user) next()
    else res.redirect("/login")
}

// GET login page
router.get("/login", (req, res) => {
    if (req.session.user) {
        return res.redirect("/dashboard")
    }
    res.render("login")
})

// POST login
router.post("/login", async (req, res) => {
    const { username, password } = req.body
    const auth = loadModule("auth")
    const db = req.app.locals.db

    try {
        const result = await auth.login(username, password, db)

        if (result.success) {
            // ✅ Store logged-in user in session
            req.session.user = username
            res.redirect("/dashboard")
        } else {
            res.send("Login failed")
        }
    } catch (err) {
        console.error(err)
        res.status(500).send("Error during login")
    }
})

// Protected dashboard route
router.get("/dashboard", requireLogin, (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login")
    }

    res.render("dashboard", {
        username: req.session.user
    })
})

// Logout
router.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send("Logout failed")
        res.redirect("/login")
    })
})

module.exports = router