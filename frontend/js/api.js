const API_BASE = "https://auction-house-vszz.onrender.com";

const Auth = {
  getToken() {
    return localStorage.getItem("ah_token");
  },
  getUser() {
    const raw = localStorage.getItem("ah_user");
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem("ah_token", token);
    localStorage.setItem("ah_user", JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem("ah_token");
    localStorage.removeItem("ah_user");
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  isAdmin() {
    const u = this.getUser();
    return !!u && u.role === "admin";
  },
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = "login.html";
    }
  },
  requireAdmin() {
    if (!this.isLoggedIn() || !this.isAdmin()) {
      window.location.href = "index.html";
    }
  },
  logout() {
    this.clearSession();
    window.location.href = "index.html";
  },
};

async function apiRequest(path, { method = "GET", body = null, form = false, auth = true } = {}) {
  const headers = {};
  let payload = body;

  if (form) {
    payload = new URLSearchParams(body);
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  } else if (body) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (auth && Auth.getToken()) {
    headers["Authorization"] = `Bearer ${Auth.getToken()}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const message = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

function renderNav(activePage = "") {
  const el = document.getElementById("nav-slot");
  if (!el) return;
  const user = Auth.getUser();

  let links = `<a href="index.html">Catalog</a>`;
  let right = "";

  if (user) {
    if (user.role === "admin") {
      links += `<a href="admin.html">My Auctions</a>`;
    }
    right = `
      <span class="pill ${user.role === "admin" ? "role-admin" : ""}">${user.role === "admin" ? "Auctioneer" : "Bidder"} · ${user.username}</span>
      <button class="btn btn-outline" id="logout-btn">Sign out</button>
    `;
  } else {
    right = `
      <a class="btn btn-outline" href="login.html">Sign in</a>
      <a class="btn btn-brass" href="register.html">Register</a>
    `;
  }

  el.innerHTML = `<div class="nav-links">${links}</div><div class="nav-links">${right}</div>`;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => Auth.logout());
}

function money(amount) {
  const n = Number(amount);
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatCountdown(msRemaining) {
  if (msRemaining <= 0) return "00:00:00:00";
  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function toLocalInputValue(date) {
  const off = date.getTimezoneOffset();
  const local = new Date(date.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}
