let allAuctions = [];
let currentFilter = "all";

function lotCard(a) {
  const img = a.product.image_url
    ? `<img src="${a.product.image_url}" alt="${a.product.name}">`
    : `No image provided`;

  const stamp = a.status === "ended" ? `<div class="sold-stamp">${a.winner ? "Sold" : "Passed"}</div>` : "";

  const priceLabel = a.status === "ended" ? (a.winner ? "Hammer price" : "Reserve, unsold") : (a.highest_bid ? "Current bid" : "Starting price");
  const priceValue = a.highest_bid ?? a.product.starting_price;

  return `
    <a class="lot-card" href="auction.html?id=${a.id}">
      <span class="status-badge status-${a.status}">${a.status}</span>
      ${stamp}
      <div class="lot-media">${img}</div>
      <div class="lot-body">
        <span class="lot-number">Lot ${String(a.id).padStart(3, "0")}</span>
        <h3 class="lot-title">${a.product.name}</h3>
        <p class="lot-desc">${a.product.description || "No description provided."}</p>
        <div class="lot-meta">
          <div>
            <span class="lot-price-label">${priceLabel}</span>
            <span class="lot-price">${money(priceValue)}</span>
          </div>
          <div>
            <span class="lot-price-label">${a.total_bids} bid${a.total_bids === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>
    </a>
  `;
}

function renderCatalog() {
  const slot = document.getElementById("catalog-slot");
  const filtered = currentFilter === "all" ? allAuctions : allAuctions.filter((a) => a.status === currentFilter);

  if (filtered.length === 0) {
    slot.innerHTML = `<div class="empty-state"><h3>No lots here yet</h3><p>Check back soon, or try a different filter.</p></div>`;
    return;
  }

  slot.innerHTML = `<div class="catalog-grid">${filtered.map(lotCard).join("")}</div>`;
}

async function loadCatalog() {
  try {
    allAuctions = await apiRequest("/auctions", { auth: false });
    renderCatalog();
  } catch (err) {
    document.getElementById("catalog-slot").innerHTML = `<div class="error-msg visible">Could not load the catalog: ${err.message}</div>`;
  }
}

document.querySelectorAll(".filter-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    currentFilter = chip.dataset.filter;
    renderCatalog();
  });
});

renderNav();
loadCatalog();
setInterval(loadCatalog, 15000);
