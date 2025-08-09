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
    
    // Crear tabla scan_groups
    db.run(`
        CREATE TABLE IF NOT EXISTS scan_groups (
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
    
    console.log("✅ Tablas creadas correctamente.");
});

db.close();