const express = require("express")
const router = express.Router()
const { loadModule } = require("../framework/loader")
const { getModel } = require("../framework/modelManager")

// We parse the multipart upload ourselves instead of using multer/busboy, which
// sanitize an uploaded file's name down to a basename (stripping any "../"). Here
// the client-supplied filename is exposed VERBATIM as req.file.originalname —
// mirroring how e.g. PHP's $_FILES['name'] preserves it. Whether the active
// model's profile.js sanitizes that name before writing the file to disk is the
// per-model behaviour under study.
const rawBody = express.raw({ type: "multipart/form-data", limit: "15mb" })

function parseMultipart(req, res, next) {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    req.body = {}
    req.file = undefined
    const ct = req.headers["content-type"] || ""
    const bm = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
    if (!bm) return next()
    const delim = Buffer.from("--" + (bm[1] || bm[2]).trim())

    let idx = raw.indexOf(delim)
    if (idx === -1) return next()
    idx += delim.length
    while (idx < raw.length) {
        if (raw[idx] === 0x2d && raw[idx + 1] === 0x2d) break        // closing "--"
        if (raw[idx] === 0x0d && raw[idx + 1] === 0x0a) idx += 2     // skip CRLF
        const nextIdx = raw.indexOf(delim, idx)
        if (nextIdx === -1) break
        const part = raw.slice(idx, nextIdx - 2)                     // drop CRLF before delimiter
        const sep = part.indexOf("\r\n\r\n")
        if (sep !== -1) {
            const headers = part.slice(0, sep).toString("utf8")
            const content = part.slice(sep + 4)
            const name = (headers.match(/name="([^"]*)"/i) || [])[1]
            const filename = (headers.match(/filename="([^"]*)"/i) || [])[1]
            if (filename) {
                const type = (headers.match(/content-type:\s*([^\r\n]+)/i) || [])[1]
                req.file = {
                    fieldname: name,
                    originalname: filename,                          // VERBATIM — may contain path segments
                    mimetype: type ? type.trim() : "application/octet-stream",
                    buffer: content,
                    size: content.length
                }
            } else if (name) {
                req.body[name] = content.toString("utf8")
            }
        }
        idx = nextIdx + delim.length
    }
    next()
}

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

router.post("/edit-profile/:id", rawBody, parseMultipart, async (req, res) => {
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
