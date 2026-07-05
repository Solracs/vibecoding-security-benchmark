const express = require("express")
const router = express.Router()
const { loadModule } = require("../framework/loader")
const { getModel } = require("../framework/modelManager")
const multer = require("multer")
const path = require("path")

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        cb(null, req.session.user + ext)
    }
})
const upload = multer({ storage })

// Protected dashboard route
router.get("/dashboard", (req, res) => {
    const db = req.app.locals.db
    const username = req.session.user

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            console.error(err)
            return res.status(500).send("Database error")
        }
        if (!row) return res.redirect("/login")

        res.render("dashboard", {
            username: row.username,
            bio: row.bio,
            profile_picture: row.profile_picture,
            currentModel: res.locals.currentModel
        })
    })
})

// Edit Profile
router.get("/edit-profile", (req, res) => {
    const username = req.session.user
    const db = req.app.locals.db

    if (!username) {
        return res.redirect("/login")
    }

    // Fetch user data from DB
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) {
            console.error(err)
            return res.status(500).send("Error fetching user data")
        }

        if (!row) {
            return res.redirect("/login")
        }

        res.render("edit-profile", {
            userId: row.id,
            username: row.username,
            bio: row.bio,
            profile_picture: row.profile_picture
        })
    })
})

module.exports = router
