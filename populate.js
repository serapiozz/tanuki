const sqlite3 = require("sqlite3").verbose();

// Función para traducir texto usando Google Translate (gratis, sin API key)
async function translateText(text, targetLang = 'es') {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            return data[0][0][0];
        }
        return text; // Fallback al texto original
    } catch (error) {
        console.error('Error en traducción:', error);
        return text; // Fallback al texto original
    }
}

// Función para hacer peticiones a Jikan API con delay para evitar rate limiting
async function fetchFromJikan(endpoint) {
    try {
        const response = await fetch(`https://api.jikan.moe/v4${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching from Jikan: ${error.message}`);
        return null;
    }
}

// Función para esperar entre requests (Jikan tiene rate limiting)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Función principal que maneja toda la población de la base de datos
async function populateDatabase() {
    const db = new sqlite3.Database("./database.db");
    
    console.log("🚀 Iniciando población de base de datos con Jikan API...");

    try {
        // ===== MANGAS =====
        console.log("📚 Obteniendo mangas populares...");
        
        const mangasToSearch = [
            "One Piece",
            "Naruto", 
            "Bleach",
            "Attack on Titan",
            "Fullmetal Alchemist",
            "Dragon Ball",
            "Death Note",
            "Demon Slayer",
            "Jujutsu Kaisen",
            "Chainsaw Man"
        ];
        
        const spanishNames = [
            "One Piece",
            "Naruto",
            "Bleach", 
            "Ataque a los Titanes",
            "Fullmetal Alchemist",
            "Dragon Ball",
            "Death Note",
            "Demon Slayer",
            "Jujutsu Kaisen",
            "Chainsaw Man"
        ];
        
        const mangas = [];
        
        for (let i = 0; i < mangasToSearch.length; i++) {
            console.log(`📖 Buscando: ${mangasToSearch[i]}...`);
            
            // Buscar el manga por nombre para obtener el ID correcto
            const searchResponse = await fetchFromJikan(`/manga?q=${encodeURIComponent(mangasToSearch[i])}&limit=1`);
            
            if (searchResponse && searchResponse.data && searchResponse.data.length > 0) {
                const firstResult = searchResponse.data[0];
                console.log(`✅ Encontrado: ${firstResult.title} (ID: ${firstResult.mal_id})`);
                
                // Ahora obtener los detalles completos del manga correcto
                await sleep(1000);
                const detailResponse = await fetchFromJikan(`/manga/${firstResult.mal_id}`);
                
                if (detailResponse && detailResponse.data) {
                    const manga = detailResponse.data;
                    
                    // Traducir la sinopsis automáticamente
                    let description = `Historia de ${spanishNames[i]}`;
                    if (manga.synopsis) {
                        console.log(`🌐 Traduciendo sinopsis de ${spanishNames[i]}...`);
                        const cleanSynopsis = manga.synopsis.replace(/\[Written by MAL Rewrite\]/g, '').trim();
                        description = await translateText(cleanSynopsis.substring(0, 350));
                        await sleep(500); // Pausa entre traducciones
                    }
                    
                    mangas.push([
                        spanishNames[i] || "Manga sin título",
                        description || `Historia de ${spanishNames[i]}`,
                        manga.images?.jpg?.image_url || manga.images?.jpg?.large_image_url || "https://via.placeholder.com/300x400/ff6500/white?text=No+Image"
                    ]);
                } else {
                    // Fallback
                    mangas.push([
                        spanishNames[i],
                        `Historia de ${spanishNames[i]}`,
                        "https://via.placeholder.com/300x400/ff6500/white?text=No+Image"
                    ]);
                }
            } else {
                // Fallback si no se encuentra el manga
                console.log(`❌ No se encontró: ${mangasToSearch[i]}`);
                mangas.push([
                    spanishNames[i],
                    `Historia de ${spanishNames[i]}`,
                    "https://via.placeholder.com/300x400/ff6500/white?text=No+Image"
                ]);
            }
            
            // Esperar 2 segundos entre requests para respetar rate limits
            await sleep(2000);
        }

        // Insertar mangas en la BD con validación extra
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                console.log("💾 Insertando mangas en la base de datos...");
                db.run("DELETE FROM mangas");
                
                mangas.forEach((m, index) => {
                    // Validar que todos los campos tengan valores
                    const title = m[0] && m[0].trim() ? m[0].trim() : `Manga ${index + 1}`;
                    const description = m[1] && m[1].trim() ? m[1].trim() : `Descripción del manga ${title}`;
                    const cover = m[2] && m[2].trim() ? m[2].trim() : "https://via.placeholder.com/300x400/ff6500/white?text=No+Image";
                    
                    console.log(`Insertando: ${title}`);
                    db.run("INSERT INTO mangas (title, description, cover) VALUES (?, ?, ?)", [title, description, cover], function(err) {
                        if (err) {
                            console.error(`Error insertando ${title}:`, err);
                        }
                    });
                });
                console.log("✅ Mangas insertados correctamente");
                resolve();
            });
        });

        await sleep(2000); // Pausa entre secciones

        // ===== COMUNIDADES =====
        console.log("👥 Creando comunidades temáticas...");
        
        const communities = [
            ["Fans de One Piece", "Comunidad dedicada a discutir teorías, arcos argumentales y personajes de la obra maestra de Oda", mangas[0] ? mangas[0][2] : "https://via.placeholder.com/300x400"],
            ["Naruto Shippuden Club", "Espacio para fanáticos del mundo ninja creado por Masashi Kishimoto", mangas[1] ? mangas[1][2] : "https://via.placeholder.com/300x400"],
            ["Otakus Unidos", "Comunidad general para discutir cualquier anime, manga y cultura japonesa", mangas[2] ? mangas[2][2] : "https://via.placeholder.com/300x400"],
            ["Shonen Jump Legends", "Comunidad dedicada a las obras legendarias de la revista Weekly Shonen Jump", mangas[3] ? mangas[3][2] : "https://via.placeholder.com/300x400"],
            ["Titanes y Teorías", "Análisis profundo y teorías sobre Attack on Titan de Hajime Isayama", mangas[3] ? mangas[3][2] : "https://via.placeholder.com/300x400"],
            ["Dragon Ball Universe", "Todo sobre el universo Dragon Ball: manga, anime, películas y videojuegos", mangas[5] ? mangas[5][2] : "https://via.placeholder.com/300x400"]
        ];

        await new Promise((resolve) => {
            db.serialize(() => {
                console.log("💾 Insertando comunidades en la base de datos...");
                db.run(`CREATE TABLE IF NOT EXISTS communities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    cover TEXT NOT NULL
                )`);
                
                db.run("DELETE FROM communities");
                communities.forEach(c => {
                    db.run("INSERT INTO communities (name, description, cover) VALUES (?, ?, ?)", c);
                });
                console.log("✅ Comunidades insertadas correctamente");
                resolve();
            });
        });

        // ===== GRUPOS DE SCAN =====
        console.log("🔧 Creando grupos de scan...");
        
        const groups = [
            ["Tanuki Scans", "Grupo especializado en traducciones al español de One Piece, Naruto y mangas shonen clásicos", mangas[0] ? mangas[0][2] : "https://via.placeholder.com/300x400"],
            ["MangaPlus Español", "Traducciones oficiales y fan-made de los últimos capítulos de manga", mangas[1] ? mangas[1][2] : "https://via.placeholder.com/300x400"],
            ["OtakuTeam México", "Fansub mexicano especializado en scanlation de series shonen y seinen", mangas[2] ? mangas[2][2] : "https://via.placeholder.com/300x400"],
            ["Hispano Manga TL", "Grupo hispano especializado en traducciones de alta calidad de mangas clásicos", mangas[4] ? mangas[4][2] : "https://via.placeholder.com/300x400"],
            ["Shonen Masters ES", "Traducciones rápidas de las obras más populares de Shonen Jump", mangas[6] ? mangas[6][2] : "https://via.placeholder.com/300x400"],
            ["Kawaii Translations", "Especializados en manga shoujo, romance y slice of life en español", mangas[7] ? mangas[7][2] : "https://via.placeholder.com/300x400"]
        ];

        await new Promise((resolve) => {
            db.serialize(() => {
                console.log("💾 Insertando grupos de scan en la base de datos...");
                db.run(`CREATE TABLE IF NOT EXISTS scan_groups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    cover TEXT NOT NULL
                )`);
                
                db.run("DELETE FROM scan_groups");
                groups.forEach(g => {
                    db.run("INSERT INTO scan_groups (name, description, cover) VALUES (?, ?, ?)", g);
                });
                console.log("✅ Grupos de scan insertados correctamente");
                resolve();
            });
        });

        console.log("🎉 ¡Base de datos poblada exitosamente con datos traducidos automáticamente!");
        
    } catch (error) {
        console.error("❌ Error al poblar la base de datos:", error);
    } finally {
        db.close();
    }
}

// Ejecutar el script
populateDatabase();