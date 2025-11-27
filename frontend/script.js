/* ===========================================================
   SpotOn - Final Unified Frontend Script (Browser Safe)
   =========================================================== */

/* ---------- AUTO API DETECTION ---------- */
function getApiBase() {
  const origin = window.location.origin;

  // If served through DevTunnel
  if (origin.includes(".devtunnels.ms")) {
    return origin + "/api";   // backend + frontend same origin
  }

  // Localhost backend during development
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return "http://localhost:5503/api";
  }

  // Default (static hosting)
  return origin + "/api";
}

const API_BASE = getApiBase();
console.log("🌍 API Base:", API_BASE);


/* ---------- SOCKET.IO (GLOBAL) ---------- */
let socket = null;
try {
  socket = io(API_BASE.replace("/api", ""), { transports: ["websocket"] });
} catch (err) {
  console.warn("Socket.IO not available on this page");
}


/* ===========================================================
   AUTH HELPERS
=========================================================== */

function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) location.href = "login.html";
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


/* ===========================================================
   CONTACT FORM
=========================================================== */
const contactForm = document.getElementById("contactForm");
if (contactForm) {
  const formMsg = document.getElementById("formMsg");

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    formMsg.textContent = "Sending...";

    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactForm.name.value,
          email: contactForm.email.value,
          message: contactForm.message.value
        })
      });

      const data = await res.json();
      formMsg.textContent = res.ok ? "Message sent ✔" : data.message;

      if (res.ok) contactForm.reset();
    } catch (err) {
      formMsg.textContent = "Server unreachable";
    }
  });
}


/* ===========================================================
   LOGIN & SIGNUP (login.html)
=========================================================== */
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const authMsg = document.getElementById("authMsg");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = loginForm.email.value.trim();
    const password = loginForm.password.value.trim();

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) return (authMsg.textContent = "❌ " + data.message);

      authMsg.textContent = "✔ Login successful";
      localStorage.setItem("token", data.token);
      setTimeout(() => (location.href = "venues.html"), 600);
    } catch {
      authMsg.textContent = "❌ Server error";
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = signupForm.name.value.trim();
    const email = signupForm.email.value.trim();
    const password = signupForm.password.value.trim();

    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();
      authMsg.textContent = res.ok
        ? "✔ Signup successful. Login now!"
        : "❌ " + data.message;
    } catch {
      authMsg.textContent = "❌ Server error";
    }
  });
}


/* ===========================================================
   DASHBOARD — USER BOOKINGS
=========================================================== */
async function loadDashboardBookings() {
  const bookingTable = document.getElementById("bookingTable");
  if (!bookingTable) return;

  const token = requireAuth();

  try {
    const res = await fetch(`${API_BASE}/bookings`, {
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
          <td>${new Date(b.time).toLocaleString()}</td>
        </tr>
      `;
    });
  } catch (err) {
    bookingTable.innerHTML = "<p class='muted'>Failed to load bookings</p>";
  }
  /* ===========================================================
   AUTO-REFRESH DASHBOARD BOOKINGS (REALTIME SOCKET.IO)
=========================================================== */

if (socket) {
  socket.on("bookingCreated", (data) => {
    console.log("📢 Live booking event received:", data);

    // Only refresh if user is on dashboard page
    if (document.getElementById("bookingTable")) {
      console.log("🔄 Refreshing dashboard bookings...");
      loadDashboardBookings();
    }
  });
}
}

loadDashboardBookings();


/* ===========================================================
   SOCKET.IO GLOBAL HANDLER
   (Other pages override this with seatSelection showId)
=========================================================== */
if (socket) {
  socket.on("bookingCreated", (data) => {
    console.log("📢 Realtime update:", data);
  });
}


/* ===========================================================
   END OF FILE
=========================================================== */