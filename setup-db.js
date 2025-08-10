const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.db");

db.serialize(() => {
    console.log("Creando tablas...");
    
    // Crear tabla mangas
    db.run(`
        CREATE TABLE IF NOT EXISTS mangas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            cover TEXT NOT NULL
        )
    `);
    
    // Crear tabla communities
    db.run(`
        CREATE TABLE IF NOT EXISTS communities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            cover TEXT NOT NULL
        )
    `);
    
    // Crear tabla groups
    db.run(`
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            cover TEXT NOT NULL
        )
    `);
    
    // Crear tabla users (si no existe)
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            avatar TEXT
        )
    `);
    
    // Crear tabla library
    db.run(`
        CREATE TABLE IF NOT EXISTS user_library (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            manga_id INTEGER NOT NULL,
            status TEXT DEFAULT 'leyendo',
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (manga_id) REFERENCES mangas(id)
        )
    `);
    
    console.log("✅ Tablas creadas correctamente.");
});

db.close();