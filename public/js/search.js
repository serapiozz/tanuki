const searchInput = document.getElementById("searchInput");
const itemsContainer = document.getElementById("itemsContainer");
const currentPage = document.body.getAttribute("data-page");

if (searchInput && itemsContainer) {
    searchInput.addEventListener("input", function() {
        const q = this.value.trim();
        let apiUrl = "";

        if (currentPage === "biblioteca") {
            apiUrl = `/api/search/mangas?q=${encodeURIComponent(q)}`;
        } else if (currentPage === "comunidades") {
            apiUrl = `/api/search/communities?q=${encodeURIComponent(q)}`;
        } else if (currentPage === "grupos") {
            apiUrl = `/api/search/groups?q=${encodeURIComponent(q)}`;
        }

        fetch(apiUrl)
            .then(res => res.json())
            .then(items => {
                itemsContainer.innerHTML = "";
                items.forEach(item => {
                    itemsContainer.innerHTML += `
                        <div class="card bg-neutral-900 p-4 rounded-lg">
                            <img src="${item.cover}" alt="${item.title || item.name}">
                            <h3 class="text-lg font-semibold mt-3">${item.title || item.name}</h3>
                            <p class="text-sm text-neutral-400 mt-1">${item.description}</p>
                        </div>
                    `;
                });
            });
    });
}
