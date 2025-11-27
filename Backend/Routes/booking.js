const show = "show1"; // Current show
const seatGrid = document.getElementById("seatGrid");  
const bookBtn = document.getElementById("bookBtn");
let selectedSeats = [];

// Check login
const token = localStorage.getItem("token");
if (!token) {
  alert("Please login to book seats!");
  location.href = "login.html";
}

// Load seats dynamically from backend
async function loadSeats() {
  try {
    const res = await fetch(`http://localhost:5503/api/seats/${show}`, {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();

    seatGrid.innerHTML = ""; // clear previous buttons

    data.seats.forEach(seat => {
      const btn = document.createElement("button");
      btn.textContent = seat;
      btn.className = data.booked.includes(seat) ? "seat booked" : "seat available";
      btn.disabled = data.booked.includes(seat);

      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        if (selectedSeats.includes(seat)) {
          selectedSeats = selectedSeats.filter(s => s !== seat);
          btn.classList.remove("selected");
        } else {
          selectedSeats.push(seat);
          btn.classList.add("selected");
        }
      });

      seatGrid.appendChild(btn);
    });

  } catch (err) {
    console.error("Failed to load seats:", err);
    alert("Error loading seat layout. Please try again later.");
  }
}

// Book selected seats (all at once)
bookBtn.addEventListener("click", async () => {
  if(selectedSeats.length === 0) return alert("Select seats first!");

  try {
    const res = await fetch("http://localhost:5503/api/booking", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ seat: selectedSeats, show })
    });

    const data = await res.json();

    // Display success/failure per seat
    let msg = "";
    if(data.results.booked.length > 0) {
      msg += `✅ Booked: ${data.results.booked.join(", ")}\n`;
    }
    if(data.results.failed.length > 0) {
      msg += `❌ Failed: ${data.results.failed.map(f => f.seat + " (" + f.reason + ")").join(", ")}`;
    }
    alert(msg);

    selectedSeats = [];  // reset selection
    loadSeats();         // refresh seat layout

  } catch(err) {
    console.error(err);
    alert("Error booking seats. Try again.");
  }
});

// Initial load
loadSeats();