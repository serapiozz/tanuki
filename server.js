const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const db = new sqlite3.Database("./database.db");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Sesiones
app.use(session({
    secret: "tanuki_secret",
    resave: false,
    saveUninitialized: false
}));

// ===== CREACIÓN DE TABLAS =====
db.serialize(() => {
    // Usuarios
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            avatar TEXT
        )
    `);

    // Biblioteca
    db.run(`
        CREATE TABLE IF NOT EXISTS mangas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            cover TEXT NOT NULL
        )
    `, (err) => {
        if (err) throw err;
        db.get("SELECT COUNT(*) AS count FROM mangas", (err, row) => {
            if (err) throw err;
            if (row.count === 0) {
                db.run("INSERT INTO mangas (title, description, cover) VALUES (?, ?, ?)",
                    ["One Piece", "La historia de Luffy y su tripulación en busca del One Piece.", "/images/onepiece.jpg"]);
                db.run("INSERT INTO mangas (title, description, cover) VALUES (?, ?, ?)",
                    ["Naruto", "La vida de un joven ninja que sueña con ser Hokage.", "/images/naruto.jpg"]);
            }
        });
    });

    // Comunidades
    db.run(`
        CREATE TABLE IF NOT EXISTS communities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            cover TEXT NOT NULL
        )
    `, (err) => {
        if (err) throw err;
        db.get("SELECT COUNT(*) AS count FROM communities", (err, row) => {
            if (err) throw err;
            if (row.count === 0) {
                db.run("INSERT INTO communities (name, description, cover) VALUES (?, ?, ?)",
                    ["Fans One Piece", "Comunidad para hablar de One Piece", "/images/comm_onepiece.jpg"]);
                db.run("INSERT INTO communities (name, description, cover) VALUES (?, ?, ?)",
                    ["Naruto Lovers", "Comunidad de fans de Naruto", "/images/comm_naruto.jpg"]);
            }
        });
    });

    // Grupos
    db.run(`
        CREATE TABLE IF NOT EXISTS scan_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            cover TEXT NOT NULL
        )
    `, (err) => {
        if (err) throw err;
        db.get("SELECT COUNT(*) AS count FROM scan_groups", (err, row) => {
            if (err) throw err;
            if (row.count === 0) {
                db.run("INSERT INTO scan_groups (name, description, cover) VALUES (?, ?, ?)",
                    ["Tanuki Scan", "Grupo oficial de traducciones Tanuki", "/images/group_tanuki.jpg"]);
                db.run("INSERT INTO scan_groups (name, description, cover) VALUES (?, ?, ?)",
                    ["MangaFast", "Grupo de traducción rápida de mangas", "/images/group_mangafast.jpg"]);
            }
        });
    });
});

// ===== Middleware para marcar página y título =====
app.use((req, res, next) => {
    let displayName = "";
    if (req.session.user) {
        displayName = req.session.user.username;
        if (displayName.length > 12) {
            displayName = displayName.substring(0, 12) + "...";
        }
        displayName = ` - ${displayName}`;
    }

    if (req.path === '/' || req.path.startsWith('/biblioteca')) {
        res.locals.currentPage = 'biblioteca';
        res.locals.title = `Biblioteca - Tanuki${displayName}`;
    } else if (req.path.startsWith('/communities')) {
        res.locals.currentPage = 'comunidades';
        res.locals.title = `Comunidades - Tanuki${displayName}`;
    } else if (req.path.startsWith('/scan-groups')) {
        res.locals.currentPage = 'grupos';
        res.locals.title = `Grupos - Tanuki${displayName}`;
    } else {
        res.locals.currentPage = '';
        res.locals.title = `Tanuki${displayName}`;
    }
    next();
});

// ===== RUTAS =====

// Biblioteca
app.get("/", (req, res) => {
    db.all("SELECT * FROM mangas", (err, mangas) => {
        if (err) throw err;
        res.render("tanuki", { user: req.session.user, mangas, communities: [], groups: [], title: res.locals.title });
    });
});

// Comunidades
app.get("/communities", (req, res) => {
    db.all("SELECT * FROM communities", (err, communities) => {
        if (err) throw err;
        res.render("tanuki", { user: req.session.user, mangas: [], communities, groups: [], title: res.locals.title });
    });
});

// Grupos
app.get("/scan-groups", (req, res) => {
    db.all("SELECT * FROM scan_groups", (err, groups) => {
        if (err) throw err;
        res.render("tanuki", { user: req.session.user, mangas: [], communities: [], groups, title: res.locals.title });
    });
});

// Login
app.get("/login", (req, res) => {
    res.render("login", { error: null, title: "Iniciar sesión" });
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) throw err;
        if (!user) return res.render("login", { error: "Usuario no encontrado", title: "Iniciar sesión" });
        if (!bcrypt.compareSync(password, user.password)) return res.render("login", { error: "Contraseña incorrecta", title: "Iniciar sesión" });
        req.session.user = user;
        res.redirect("/");
    });
});

// Registro
app.get("/register", (req, res) => {
    res.render("register", { error: null, title: "Registro" });
});

app.post("/register", (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO users (username, password, avatar) VALUES (?, ?, ?)", 
        [username, hashedPassword, "/images/default-avatar.png"], (err) => {
            if (err) return res.render("register", { error: "Usuario ya existe", title: "Registro" });
            res.redirect("/login");
    });
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

// ===== API de Búsqueda =====
app.get("/api/search/mangas", (req, res) => {
    const query = req.query.q ? `%${req.query.q}%` : "%";
    db.all("SELECT * FROM mangas WHERE title LIKE ?", [query], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.get("/api/search/communities", (req, res) => {
    const query = req.query.q ? `%${req.query.q}%` : "%";
    db.all("SELECT * FROM communities WHERE name LIKE ?", [query], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.get("/api/search/groups", (req, res) => {
    const query = req.query.q ? `%${req.query.q}%` : "%";
    db.all("SELECT * FROM scan_groups WHERE name LIKE ?", [query], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.listen(3000, () => {
    console.log("Servidor corriendo en http://localhost:3000");
});
