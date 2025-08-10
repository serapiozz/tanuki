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
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            avatar TEXT
        )
    `);

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

    db.run(`
    CREATE TABLE IF NOT EXISTS user_library (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        manga_id INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(manga_id) REFERENCES mangas(id)
    )
`);

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
                    ["Fans de One Piece", "Comunidad para hablar sobre One Piece", "/images/community-op.jpg"]);
                db.run("INSERT INTO communities (name, description, cover) VALUES (?, ?, ?)",
                    ["Naruto Shippuden LATAM", "Comunidad de fans de Naruto", "/images/community-naruto.jpg"]);
            }
        });
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            cover TEXT NOT NULL
        )
    `, (err) => {
        if (err) throw err;
        db.get("SELECT COUNT(*) AS count FROM groups", (err, row) => {
            if (err) throw err;
            if (row.count === 0) {
                db.run("INSERT INTO groups (name, description, cover) VALUES (?, ?, ?)",
                    ["ScanLatino", "Grupo de scan de manga en español", "/images/group-scanlatino.jpg"]);
                db.run("INSERT INTO groups (name, description, cover) VALUES (?, ?, ?)",
                    ["MangaPro", "Grupo profesional de traducción de manga", "/images/group-mangapro.jpg"]);
            }
        });
    });
}); // <-- ESTA ES LA ÚNICA CIERRE DEL db.serialize

    // Datos iniciales
    db.get("SELECT COUNT(*) AS count FROM mangas", (err, row) => {
        if (err) throw err;
        if (row.count === 0) {
            db.run("INSERT INTO mangas (title, description, cover) VALUES (?, ?, ?)",
                ["One Piece", "La historia de Luffy y su tripulación en busca del One Piece.", "/images/onepiece.jpg"]);
            db.run("INSERT INTO mangas (title, description, cover) VALUES (?, ?, ?)",
                ["Naruto", "La vida de un joven ninja que sueña con ser Hokage.", "/images/naruto.jpg"]);
        }
    });
;

// Middleware para título y página actual
app.use((req, res, next) => {
    let displayName = "";
    if (req.session.user) {
        displayName = req.session.user.username.length > 12
            ? req.session.user.username.substring(0, 12) + "..."
            : req.session.user.username;
        displayName = ` - ${displayName}`;
    }

    if (req.path === '/' || req.path.startsWith('/home')) {
        res.locals.currentPage = 'home';
        res.locals.title = `Inicio${displayName}`;
    } else if (req.path.startsWith('/my-library')) {
        res.locals.currentPage = 'my-library';
        res.locals.title = `Mi Biblioteca${displayName}`;
    } else if (req.path.startsWith('/communities')) {
        res.locals.currentPage = 'comunidades';
        res.locals.title = `Comunidades${displayName}`;
    } else if (req.path.startsWith('/groups')) {
        res.locals.currentPage = 'grupos';
        res.locals.title = `Grupos${displayName}`;
    } else {
        res.locals.currentPage = '';
        res.locals.title = `Tanuki${displayName}`;
    }
    next();
});

// ===== RUTAS =====

// Home
app.get("/", (req, res) => {
    db.all("SELECT * FROM mangas", (err, mangas) => {
        if (err) throw err;
        res.render("home", { user: req.session.user, mangas, populares: mangas });
    });
});

// Biblioteca personal
app.get("/my-library", (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    const userId = req.session.user.id;
    db.all(`
        SELECT m.* 
        FROM user_library ul
        JOIN mangas m ON ul.manga_id = m.id
        WHERE ul.user_id = ?`,
        [userId],
        (err, mangas) => {
            if (err) throw err;
            res.render("my-library", {
                user: req.session.user,
                mangas
            });
        }
    );
});

// Comunidades
app.get("/communities", (req, res) => {
    db.all("SELECT * FROM communities", (err, communities) => {
        if (err) throw err;
        res.render("communities", { 
            user: req.session.user, 
            communities,
            title: "Comunidades",
            currentPage: "communidades"
        });
    });
});

// Grupos
app.get("/groups", (req, res) => {
    db.all("SELECT * FROM groups", (err, groups) => {
        if (err) throw err;
        res.render("groups", { 
            user: req.session.user, 
            groups,
            title: "Grupos",
            currentPage: "grupos"
        });
    });
});


// Login y registro
app.get("/login", (req, res) => {
    res.render("login", { error: null });
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) throw err;
        if (!user) return res.render("login", { error: "Usuario no encontrado" });
        if (!bcrypt.compareSync(password, user.password)) {
            return res.render("login", { error: "Contraseña incorrecta" });
        }
        req.session.user = user;
        res.redirect("/");
    });
});

app.get("/register", (req, res) => {
    res.render("register", { error: null });
});

app.post("/register", (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO users (username, password, avatar) VALUES (?, ?, ?)",
        [username, hashedPassword, "/images/default-avatar.png"],
        (err) => {
            if (err) return res.render("register", { error: "Usuario ya existe" });
            res.redirect("/login");
        });
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

app.listen(3000, () => {
    console.log("Servidor corriendo en http://localhost:3000");
});
