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

router.post("/edit-profile/:id", upload.single("profile_picture"), async (req, res) => {
    const username = req.session.user
    const db = req.app.locals.db
    const targetUserId = req.params.id

    if (!username) {
        return res.redirect("/login")
    }

    try {
        // Dynamically load the profile module for the currently active model
        const profileModule = loadModule("profile")

        // Delegate execution directly to the LLM-generated code
        await profileModule.updateProfile(req, res, db, targetUserId)

    } catch (err) {
        console.error("Error executing dynamic profile module:", err)
        res.status(500).send("Execution error within the active LLM module.")
    }
})

module.exports = router
