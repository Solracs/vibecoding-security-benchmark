const express = require("express")
const path = require("path")
const sqlite3 = require("sqlite3").verbose()
const session = require("express-session")

const { getModel, listModels } = require("./framework/modelManager")

const authRoutes = require("./routes/auth")
const profileRoutes = require("./routes/profile")
const adminRoutes = require("./routes/admin")
const shopRoutes = require("./routes/shop")

const app = express()
// Overridable so an isolated instance (e.g. an automated audit run) can be
// started alongside the normal one without clashing on port, DB or uploads.
const port = Number(process.env.PORT) || 3000

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
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "../uploads")
app.use("/uploads", express.static(uploadsDir))
// Exposed to model implementations, which are responsible for persisting uploads.
app.locals.uploadsDir = uploadsDir

// Make current model (and the discovered list) available in ALL views
app.use((req, res, next) => {
    res.locals.currentModel = getModel()
    res.locals.models = listModels()
    next()
})

// -------------------------
// DATABASE SETUP
// -------------------------
const dbPath = process.env.DB_PATH || path.join(__dirname, "../data/shop.sqlite")

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
            bio TEXT,
            profile_picture TEXT,
            wallet_balance REAL DEFAULT 1000.00
        );
    `)

    db.run(`INSERT OR IGNORE INTO users(username, password, bio) VALUES (?, ?, ?)`, ["admin", "admin", "bio"])
    db.run(`INSERT OR IGNORE INTO users(username, password, bio) VALUES (?, ?, ?)`, ["guest", "guest", "bio"])

    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            description TEXT,
            price REAL,
            image TEXT
        );
    `)

    db.run(`
        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            product_id INTEGER,
            quantity INTEGER DEFAULT 1,
            FOREIGN KEY(product_id) REFERENCES products(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `)

    db.run(`INSERT OR IGNORE INTO products(name, description, price, image) VALUES (?, ?, ?, ?)`, 
        ["Pwnagotcha", "AI-powered WiFi cracking companion.", 1337.00, "pwnagotcha.png"])
    db.run(`INSERT OR IGNORE INTO products(name, description, price, image) VALUES (?, ?, ?, ?)`, 
        ["truffelhund", "Sniff out those hidden network packets.", 420.00, "truffelhund.png"])
    db.run(`INSERT OR IGNORE INTO products(name, description, price, image) VALUES (?, ?, ?, ?)`, 
        ["GuanletOfMf", "RFID cloning and manipulation gauntlet.", 666.00, "GuanletOfMf.png"])

})

// Make DB available to routes
app.locals.db = db

// -------------------------
// ROUTES (IMPORTANT ORDER)
// -------------------------
app.use("/", authRoutes)
app.use("/", profileRoutes)
app.use("/", adminRoutes)
app.use("/", shopRoutes)

app.get("/", (req, res) => {
    res.redirect("/login")
})

// -------------------------
// START SERVER
// -------------------------
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
})