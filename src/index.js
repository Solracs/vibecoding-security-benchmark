const express = require("express")
const path = require("path")
const sqlite3 = require("sqlite3").verbose()
const session = require("express-session")

const { getModel } = require("./framework/modelManager")

const authRoutes = require("./routes/auth")
const profileRoutes = require("./routes/profile")
const adminRoutes = require("./routes/admin")

const app = express()
const port = 3000

// -------------------------
// SESSION
// -------------------------
app.use(session({
    secret: "super-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}))

// -------------------------
// MIDDLEWARE
// -------------------------
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))

// Make current model available in ALL views
app.use((req, res, next) => {
    res.locals.currentModel = getModel()
    next()
})

// -------------------------
// DATABASE SETUP
// -------------------------
const dbPath = path.join(__dirname, "../data/shop.sqlite")

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB connection error:", err)
    else console.log("Connected to SQLite DB")
})

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            bio TEXT DEFAULT "BIO",
            profile_picture TEXT DEFAULT "default_profpic.png"
        );
    `)

    db.run(`INSERT OR IGNORE INTO users(username, password, bio) VALUES (?, ?, ?)`, ["admin", "admin", "Admin's bio"])
    db.run(`INSERT OR IGNORE INTO users(username, password, bio) VALUES (?, ?, ?)`, ["guest", "guest", "Guest's bio"])
})

// Make DB available to routes
app.locals.db = db

// -------------------------
// ROUTES (IMPORTANT ORDER)
// -------------------------
app.use("/", authRoutes)
app.use("/", profileRoutes)
app.use("/", adminRoutes)

app.get("/", (req, res) => {
    res.redirect("/login")
})

// -------------------------
// START SERVER
// -------------------------
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
})