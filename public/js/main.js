// --- Mostrar páginas internas ---
function showPage(pageId) {
    // Ocultar todas las secciones
    document.querySelectorAll(".page-section").forEach(section => {
        section.classList.add("hidden");
    });

    // Mostrar solo la sección seleccionada
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.remove("hidden");
    }

    // Cambiar el estilo activo del botón
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("text-orange-400");
        btn.classList.add("text-neutral-300");
    });

    const activeBtn = document.querySelector(`[onclick="showPage('${pageId}')"]`);
    if (activeBtn) {
        activeBtn.classList.remove("text-neutral-300");
        activeBtn.classList.add("text-orange-400");
    }
}

// --- Buscador en vivo ---
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.querySelector("#searchManga");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const query = searchInput.value.toLowerCase();
            document.querySelectorAll(".manga-card").forEach(card => {
                const title = card.dataset.title.toLowerCase();
                card.style.display = title.includes(query) ? "" : "none";
            });
        });
    }
});
