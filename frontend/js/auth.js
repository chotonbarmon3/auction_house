 renderNav();

function showError(message) {
  const box = document.getElementById("error-box");
  if (!box) return;
  box.textContent = message;
  box.classList.add("visible");
}

// ---------- Login ----------
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        form: true,
        auth: false,
        body: { username, password },
      });
      Auth.setSession(data.access_token, data.user);
      window.location.href = data.user.role === "admin" ? "admin.html" : "index.html";
    } catch (err) {
      showError(err.message);
    }
  });
}

// ---------- Register ----------
const registerForm = document.getElementById("register-form");
if (registerForm) {
  let selectedRole = "user";

  document.querySelectorAll("#role-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#role-toggle button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedRole = btn.dataset.role;
      document.getElementById("admin-code-field").style.display = selectedRole === "admin" ? "block" : "none";
    });
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const admin_code = document.getElementById("admin_code").value;

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        auth: false,
        body: { username, email, password, role: selectedRole, admin_code: admin_code || null },
      });
      Auth.setSession(data.access_token, data.user);
      window.location.href = data.user.role === "admin" ? "admin.html" : "index.html";
    } catch (err) {
      showError(err.message);
    }
  });
}
