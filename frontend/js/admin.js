Auth.requireAdmin();
renderNav();

function showMsg(boxId, message) {
  document.querySelectorAll(".error-msg, .success-msg").forEach((b) => b.classList.remove("visible"));
  const box = document.getElementById(boxId);
  box.textContent = message;
  box.classList.add("visible");
}

function adminRow(a) {
  const priceValue = a.highest_bid ?? a.product.starting_price;
  return `
    <tr>
      <td>Lot ${String(a.id).padStart(3, "0")}</td>
      <td>${a.product.name}</td>
      <td><span class="status-badge status-${a.status}" style="position:static;">${a.status}</span></td>
      <td>${money(priceValue)}</td>
      <td>${a.total_bids}</td>
      <td>${new Date(a.start_time).toLocaleString()}</td>
      <td>${new Date(a.end_time).toLocaleString()}</td>
      <td><a href="auction.html?id=${a.id}" class="btn btn-outline" style="padding:6px 12px; font-size:12px;">View</a></td>
    </tr>
  `;
}

async function loadMyAuctions() {
  const slot = document.getElementById("my-auctions-slot");
  try {
    const auctions = await apiRequest("/auctions/mine");
    if (auctions.length === 0) {
      slot.innerHTML = `<div class="empty-state"><h3>No lots yet</h3><p>Schedule your first auction on the left.</p></div>`;
      return;
    }
    slot.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr><th>Lot</th><th>Product</th><th>Status</th><th>Price</th><th>Bids</th><th>Opens</th><th>Closes</th><th></th></tr>
        </thead>
        <tbody>${auctions.map(adminRow).join("")}</tbody>
      </table>
    `;
  } catch (err) {
    slot.innerHTML = `<div class="error-msg visible">Could not load your lots: ${err.message}</div>`;
  }
}

document.getElementById("create-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const start_time = document.getElementById("start_time").value;
  const end_time = document.getElementById("end_time").value;

  const payload = {
    product: {
      name: document.getElementById("name").value.trim(),
      description: document.getElementById("description").value.trim(),
      image_url: document.getElementById("image_url").value.trim(),
      starting_price: parseFloat(document.getElementById("starting_price").value),
      min_increment: parseFloat(document.getElementById("min_increment").value),
    },
    start_time: new Date(start_time).toISOString(),
    end_time: new Date(end_time).toISOString(),
  };

  try {
    await apiRequest("/auctions", { method: "POST", body: payload });
    showMsg("success-box", "Lot scheduled successfully.");
    e.target.reset();
    document.getElementById("min_increment").value = 1;
    loadMyAuctions();
  } catch (err) {
    showMsg("error-box", err.message);
  }
});

loadMyAuctions();
