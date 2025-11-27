// frontend/booking.js
const API_BASE = window.location.origin.includes("devtunnels.ms")
  ? "https://gwgpp1cc-5503.inc1.devtunnels.ms"  // your backend tunnel URL
  : "http://localhost:5503";

const token = localStorage.getItem("token");
const showSelect = document.getElementById("showSelect");
const seatContainer = document.getElementById("seatContainer");
const msg = document.getElementById("msg");
const bookBtn = document.getElementById("bookBtn");

async function loadSeats() {
  const show = showSelect.value;
  seatContainer.innerHTML = "<p>Loading seats...</p>";

  try {
    const res = await fetch(`${API_BASE}/api/seats/${encodeURIComponent(show)}`);
    const data = await res.json();

    if (!res.ok) {
      msg.innerHTML = `❌ ${data.message || "Failed to load seat map."}`;
      return;
    }

    // Render seat grid
    seatContainer.innerHTML = "";
    data.seats.forEach(seat => {
      const btn = document.createElement("button");
      btn.textContent = seat;
      btn.className = "seat";

      // Disable booked seats
      if (data.booked.includes(seat)) {
        btn.disabled = true;
        btn.classList.add("booked");
      }

      // Handle seat selection
      btn.addEventListener("click", () => {
        document.querySelectorAll(".seat.selected").forEach(s => s.classList.remove("selected"));
        btn.classList.add("selected");
        bookBtn.dataset.seat = seat;
      });

      seatContainer.appendChild(btn);
    });
  } catch (err) {
    console.error("Seat load error:", err);
    msg.innerHTML = "❌ Failed to load seat map.";
  }
}

async function bookSeat() {
  const seat = bookBtn.dataset.seat;
  const show = showSelect.value;

  if (!seat) {
    msg.innerHTML = "⚠️ Please select a seat first.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ seat, show })
    });

    const data = await res.json();
    if (res.ok) {
      msg.innerHTML = `✅ ${data.message}`;
      loadSeats(); // refresh seat map
    } else {
      msg.innerHTML = `❌ ${data.message}`;
    }
  } catch (err) {
    console.error("Booking error:", err);
    msg.innerHTML = "❌ Booking failed. Server unreachable.";
  }
}

// Event listeners
showSelect.addEventListener("change", loadSeats);
bookBtn.addEventListener("click", bookSeat);

// Initial load
loadSeats();