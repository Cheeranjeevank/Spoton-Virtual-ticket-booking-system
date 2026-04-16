/* ===========================================================
   SpotOn — Global Script
   =========================================================== */

/* ---------- AUTO API DETECTION ---------- */
function getApiBase() {
  const origin = window.location.origin;

  // If served through DevTunnel
  if (origin.includes(".devtunnels.ms")) {
    return origin + "/api";
  }

  // Localhost backend during development
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return "http://localhost:5507/api";
  }

  // Default (static hosting)
  return origin + "/api";
}

window.API_BASE = getApiBase();
console.log("🌍 API Base:", window.API_BASE);


/* ---------- SOCKET.IO (GLOBAL) ---------- */
let socket = null;
try {
  if (typeof io !== "undefined") {
    socket = io(window.API_BASE.replace("/api", ""), {
      transports: ["websocket", "polling"]
    });
  }
} catch (err) {
  console.warn("Socket.IO not available on this page");
}


/* ===========================================================
   AUTH HELPERS
=========================================================== */

function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    location.href = "login.html";
    return null;
  }
  return token;
}

function logout() {
  localStorage.clear();
  location.href = "login.html";
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) logoutBtn.addEventListener("click", logout);


/* ===========================================================
   MOBILE NAV MENU (Main HTML)
=========================================================== */
const menuBtn = document.getElementById("menuBtn");
const primaryNav = document.getElementById("primaryNav");

if (menuBtn && primaryNav) {
  menuBtn.addEventListener("click", () => {
    primaryNav.classList.toggle("open");
    menuBtn.setAttribute(
      "aria-expanded",
      primaryNav.classList.contains("open") ? "true" : "false"
    );
  });
}


/* ===========================================================
   THEME TOGGLE
=========================================================== */
function setTheme(light) {
  document.documentElement.classList.toggle("light", light);
  localStorage.setItem("spoton-theme", light ? "light" : "dark");

  // Update theme button emoji if present
  const btns = document.querySelectorAll(".theme");
  btns.forEach(btn => {
    btn.textContent = light ? "☀️" : "🌙";
  });
}

// Load saved theme
(function () {
  const saved = localStorage.getItem("spoton-theme");
  if (saved) document.documentElement.classList.toggle("light", saved === "light");
})();

const themeBtn = document.getElementById("themeBtn");
if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    setTheme(!document.documentElement.classList.contains("light"));
  });
}

const dashThemeBtn = document.getElementById("dashThemeBtn");
if (dashThemeBtn) {
  dashThemeBtn.addEventListener("click", () => {
    setTheme(!document.documentElement.classList.contains("light"));
  });
}


/* ===========================================================
   CONTACT FORM
=========================================================== */
const contactForm = document.getElementById("contactForm");
const formMsg = document.getElementById("formMsg");

if (contactForm && formMsg) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    formMsg.textContent = "Sending...";

    try {
      const res = await fetch(`${window.API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactForm.name.value,
          email: contactForm.email.value,
          message: contactForm.message.value
        })
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        formMsg.textContent = "❌ Invalid server response";
        return;
      }

      formMsg.textContent = res.ok ? "Message sent ✔" : (data.message || "Failed to send");
      if (res.ok) contactForm.reset();
    } catch (err) {
      formMsg.textContent = "Server unreachable";
    }
  });
}


/* ===========================================================
   YEAR FOOTER
=========================================================== */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();


/* ===========================================================
   DASHBOARD — USER BOOKINGS
=========================================================== */
async function loadDashboardBookings() {
  const bookingTable = document.getElementById("bookingTable");
  if (!bookingTable) return;

  const token = requireAuth();
  if (!token) return;

  try {
    const res = await fetch(`${window.API_BASE}/bookings`, {
      headers: { Authorization: "Bearer " + token }
    });

    const data = await res.json();
    bookingTable.innerHTML = "";

    if (!data.length) {
      bookingTable.innerHTML = "<p class='muted'>No bookings found.</p>";
      return;
    }

    data.forEach((b) => {
      bookingTable.innerHTML += `
        <tr>
          <td>${b.seat}</td>
          <td>${b.show}</td>
          <td>${new Date(b.createdAt).toLocaleString()}</td>
        </tr>
      `;
    });
  } catch (err) {
    bookingTable.innerHTML = "<p class='muted'>Failed to load bookings</p>";
  }
}

/* Auto-refresh dashboard bookings via Socket.IO */
if (socket) {
  socket.on("bookingCreated", () => {
    if (document.getElementById("bookingTable")) {
      loadDashboardBookings();
    }
  });
}

// Only run if dashboard element exists
if (document.getElementById("bookingTable")) {
  loadDashboardBookings();
}


// End of script