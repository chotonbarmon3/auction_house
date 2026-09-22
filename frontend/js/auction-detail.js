renderNav();

const params = new URLSearchParams(window.location.search);
const auctionId = params.get("id");
let auction = null;
let timerInterval = null;

function bidRow(b) {
  return `
    <div class="bid-row">
      <span>${b.bidder_username || "Bidder #" + b.bidder_id}</span>
      <span class="bid-amount">${money(b.amount)}</span>
    </div>
  `;
}

function bidSectionHtml() {
  const user = Auth.getUser();

  if (auction.status !== "live") {
    const note = auction.status === "upcoming"
      ? "Bidding has not opened yet. Come back when the clock reaches zero."
      : "This lot is closed. No further bids can be placed.";
    return `<div class="empty-state" style="padding:24px 0;"><p>${note}</p></div>`;
  }

  if (!user) {
    return `<div class="empty-state" style="padding:24px 0;"><p>Sign in as a bidder to place a bid on this lot.</p><a class="btn btn-brass" href="login.html">Sign in</a></div>`;
  }

  if (user.role === "admin") {
    return `<div class="empty-state" style="padding:24px 0;"><p>Auctioneer accounts observe lots but cannot place bids.</p></div>`;
  }

  const floor = auction.highest_bid ?? auction.product.starting_price;
  const minAllowed = auction.highest_bid != null ? Number(floor) + Number(auction.product.min_increment) : Number(floor);

  return `
    <div class="error-msg" id="bid-error"></div>
    <div class="success-msg" id="bid-success"></div>
    <form id="bid-form" class="field-row" style="align-items:flex-end;">
      <div class="field" style="margin-bottom:0;">
        <label for="bid_amount">Your bid (min ${money(minAllowed)})</label>
        <input type="number" id="bid_amount" step="0.01" min="${minAllowed}" value="${minAllowed}" required>
      </div>
      <button type="submit" class="btn btn-brass" style="height:44px;">Place bid</button>
    </form>
  `;
}

function render() {
  const p = auction.product;
  const img = p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : "No image provided";

  const priceLabel = auction.status === "ended" ? (auction.winner ? "Hammer price" : "Reserve, unsold") : (auction.highest_bid ? "Current bid" : "Starting price");
  const priceValue = auction.highest_bid ?? p.starting_price;

  document.getElementById("page-slot").innerHTML = `
    <div class="hero" style="border-bottom:none; margin-bottom:24px;">
      <span class="hero-eyebrow">Lot ${String(auction.id).padStart(3, "0")} · <span class="status-badge status-${auction.status}" style="position:static;">${auction.status}</span></span>
      <h1 style="font-size:36px;">${p.name}</h1>
    </div>

    <div class="detail-grid">
      <div>
        <div class="detail-media">${img}</div>
        <div style="margin-top:20px;">
          <div class="section-label">Description</div>
          <p style="color:var(--ash); line-height:1.6;">${p.description || "No description provided."}</p>
        </div>
      </div>

      <div>
        <div id="timer-slot"></div>

        <div class="card" style="margin-top:20px;">
          <div class="lot-meta" style="border-top:none; padding-top:0;">
            <div>
              <span class="lot-price-label">${priceLabel}</span>
              <span class="lot-price" style="font-size:28px;">${money(priceValue)}</span>
            </div>
            <div style="text-align:right;">
              <span class="lot-price-label">${auction.total_bids} bid${auction.total_bids === 1 ? "" : "s"}</span>
              ${auction.status === "ended" && auction.winner ? `<div style="font-family:var(--font-mono); font-size:13px; color:var(--moss);">Won by ${auction.winner}</div>` : ""}
            </div>
          </div>

          <div style="margin-top:20px;" id="bid-section">${bidSectionHtml()}</div>
        </div>

        <div class="bid-history">
          <div class="section-label">Bid history</div>
          ${auction.bids.length ? auction.bids.map(bidRow).join("") : `<p style="color:var(--ash); font-size:13.5px;">No bids placed yet.</p>`}
        </div>
      </div>
    </div>
  `;

  attachBidForm();
  startTimer();
}

function attachBidForm() {
  const form = document.getElementById("bid-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("bid_amount").value);
    try {
      await apiRequest(`/auctions/${auctionId}/bids`, { method: "POST", body: { amount } });
      document.getElementById("bid-success").textContent = "Bid placed successfully.";
      document.getElementById("bid-success").classList.add("visible");
      await loadAuction();
    } catch (err) {
      document.getElementById("bid-error").textContent = err.message;
      document.getElementById("bid-error").classList.add("visible");
    }
  });
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  const tick = () => {
    const slot = document.getElementById("timer-slot");
    if (!slot) return;

    const now = new Date();
    let target, label, warn = false;

    if (auction.status === "upcoming") {
      target = new Date(auction.start_time);
      label = "Opens in";
    } else if (auction.status === "live") {
      target = new Date(auction.end_time);
      label = "Closes in";
      warn = (target - now) < 5 * 60 * 1000;
    } else {
      slot.innerHTML = `<div class="gavel-timer"><span>Closed</span><span class="timer-label">Final</span></div>`;
      clearInterval(timerInterval);
      return;
    }

    const diff = target - now;
    if (diff <= 0) {
      loadAuction();
      return;
    }

    slot.innerHTML = `
      <div class="gavel-timer ${warn ? "warn" : ""}">
        <span>${formatCountdown(diff)}</span>
        <span class="timer-label">${label}<br>DD : HH : MM : SS</span>
      </div>
    `;
  };

  tick();
  timerInterval = setInterval(tick, 1000);
}

async function loadAuction() {
  try {
    auction = await apiRequest(`/auctions/${auctionId}`, { auth: false });
    render();
  } catch (err) {
    document.getElementById("page-slot").innerHTML = `<div class="error-msg visible">Could not load this lot: ${err.message}</div>`;
  }
}

if (!auctionId) {
  document.getElementById("page-slot").innerHTML = `<div class="error-msg visible">No lot specified.</div>`;
} else {
  loadAuction();
}
