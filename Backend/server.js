// ===========================================================
// SpotOn Backend — Final Updated Version with:
// - Atomic Multi-Seat Booking
// - QR Ticket Generation
// - Socket.io Live Seat Updates
// - Date-Based Show IDs
// - Auto Seat Generation from Config
// ===========================================================

import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import QRCode from "qrcode";

import Theatre from "./Models/Theatre.js";

dotenv.config();
const app = express();

// -------------------- Middleware --------------------
app.use(express.json());
app.use(morgan("dev"));
app.use(cors({ origin: true, credentials: true }));

// -------------------- Database --------------------
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((e) => console.error("❌ MongoDB Error:", e.message));

// -------------------- Models --------------------
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});
const User = mongoose.model("User", userSchema);

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  seat: String,
  show: String,
  time: { type: Date, default: Date.now },
});
const Booking = mongoose.model("Booking", bookingSchema);

const venueSchema = new mongoose.Schema({
  name: String,
  location: String,
  image: String,
});
const Venue = mongoose.model("Venue", venueSchema);

const messageSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  createdAt: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

// -------------------- Seat Configuration (Custom) --------------------
const seatConfig = {
  rows: ["A", "B", "C", "D", "E"],

  rowToCategory: {
    A: "VIP",
    B: "VIP",
    C: "Premium",
    D: "Normal",
    E: "Normal",
  },

  prices: {
    VIP: 350,
    Premium: 220,
    Normal: 150,
  },

  seatsPerRow: 8,
};

// Helper: generate seats like A1..A8, B1..B8, ...
function generateSeats() {
  const seats = [];
  seatConfig.rows.forEach((row) => {
    for (let i = 1; i <= seatConfig.seatsPerRow; i++) {
      seats.push(`${row}${i}`);
    }
  });
  return seats;
}

// ====================== AUTH MIDDLEWARE ======================
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header)
    return res.status(401).json({ message: "Authorization token missing" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

// ====================== AUTH ROUTES ======================
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashed });

    res.json({ message: "Signup successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const u = await User.findOne({ email });
    if (!u) return res.status(400).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, u.password);
    if (!valid) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ id: u._id }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    res.json({ message: "Login successful", token, user: { name: u.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================== VENUES ======================
app.get("/api/venues", async (req, res) => {
  res.json(await Venue.find());
});

app.get("/api/seedVenues", async (req, res) => {
  await Venue.deleteMany({});
  const sample = [
    { name: "PVR Cinemas", location: "Chennai", image: "PVR.jpg" },
    { name: "INOX City Center", location: "Coimbatore", image: "INOX.jpeg" },
    { name: "Sathyam Cinemas", location: "Madurai", image: "SATHYAM.png" },
    { name: "Luxe IMAX", location: "Bangalore", image: "IMAX.jpeg" },
  ];
  await Venue.insertMany(sample);
  res.json({ message: "Venues seeded" });
});


// ====================== SEAT MAP ======================
app.get("/api/seats/:showId", async (req, res) => {
  const seats = generateSeats();
  const booked = await Booking.find({ show: req.params.showId }).select("seat");

  res.json({
    seats,
    booked: booked.map((b) => b.seat),
  });
});

// ====================== SINGLE-SEAT BOOKING ======================
app.post("/api/booking", auth, async (req, res) => {
  const { seat, show } = req.body;

  if (await Booking.findOne({ seat, show }))
    return res.status(400).json({ message: `Seat ${seat} already booked` });

  const b = await Booking.create({ user: req.user, seat, show });

  io.emit("bookingCreated", { seat, show });

  res.json({ message: `Seat ${seat} booked` });
});

// ====================== MULTI-SEAT BOOKING (ATOMIC) ======================
app.post("/api/bookings/multi", auth, async (req, res) => {
  try {
    const { show, seats, meta } = req.body;

    if (!show || !Array.isArray(seats) || seats.length === 0)
      return res.status(400).json({ message: "Show and seats required" });

    const conflict = await Booking.findOne({ show, seat: { $in: seats } });

    if (conflict)
      return res
        .status(400)
        .json({ message: `Seat ${conflict.seat} already booked` });

    const docs = seats.map((s) => ({
      user: req.user,
      seat: s,
      show,
    }));

    const created = await Booking.insertMany(docs);

    created.forEach((b) => {
      io.emit("bookingCreated", { seat: b.seat, show: b.show });
    });

    res.json({ message: "Booking successful", booking: created });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

// ====================== QR TICKET ======================
app.get("/api/ticket/:id", auth, async (req, res) => {
  try {
    const b = await Booking.findById(req.params.id).lean();
    if (!b) return res.status(404).json({ message: "Not found" });
    if (String(b.user) !== req.user)
      return res.status(403).json({ message: "Not allowed" });

    const qr = await QRCode.toDataURL(
      JSON.stringify({
        id: b._id,
        show: b.show,
        seat: b.seat,
        time: b.time,
      })
    );

    res.json({ qr });
  } catch (err) {
    res.status(500).json({ message: "Error generating QR" });
  }
});

// ====================== CONTACT FORM ======================
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message)
    return res.status(400).json({ message: "All fields required" });

  await Message.create({ name, email, message });

  res.json({ message: "Message received" });
});

// ====================== STATIC FRONTEND ======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
  res.send("🎟️ SpotOn API Running Successfully");
});

// ====================== SOCKET.IO SERVER ======================
const PORT = process.env.PORT || 5503;
const server = app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

io.on("connection", (s) => {
  console.log("🟢 Client connected:", s.id);
  s.on("disconnect", () => console.log("🔴 Client disconnected:", s.id));
});


// -------------------- SHOWDATA via DB --------------------
// Get full theatre doc for a venue
app.get("/api/theatres", async (req, res) => {
  try {
    const docs = await Theatre.find({}, "-__v -createdAt -updatedAt").lean();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: "Error fetching theatres", error: err.message });
  }
});

// return screens/timings for a single venue
app.get("/api/showdata/:venue", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.venue || "").trim();
    const venueKey = await Theatre.findOne({
      venue: { $regex: `^${name}$`, $options: "i" }
    }).lean();

    if (!venueKey) return res.json({}); // empty object for no match

    // Map to { "Screen Name": [timings] } shape (like old UI expects)
    const obj = {};
    for (const s of (venueKey.screens || [])) {
      obj[s.name] = s.timings || [];
    }
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: "Error fetching showdata", error: err.message });
  }
});

// Return detailed screen object (layout + timings) for a venue+screen
app.get("/api/screens/:venue/:screen", async (req, res) => {
  try {
    const venueName = decodeURIComponent(req.params.venue || "").trim();
    const screenName = decodeURIComponent(req.params.screen || "").trim();

    const th = await Theatre.findOne({ venue: { $regex: `^${venueName}$`, $options: "i" } }).lean();
    if (!th) return res.status(404).json({ message: "Venue not found" });

    const screen = (th.screens || []).find(s => s.name.toLowerCase() === screenName.toLowerCase());
    if (!screen) return res.status(404).json({ message: "Screen not found" });

    res.json(screen);
  } catch (err) {
    res.status(500).json({ message: "Error fetching screen", error: err.message });
  }
});

// Seats route - uses screen layout (rows/seatsPerRow) from DB if available
app.get("/api/seats/:showId", async (req, res) => {
  // showId format: "Venue - Screen - Time - YYYY-MM-DD"
  const showId = req.params.showId;
  // decode & parse to find venue & screen
  const parts = decodeURIComponent(showId).split(" - ");
  const venueName = (parts[0] || "").trim();
  const screenName = (parts[1] || "").trim();

  // Default fallback seat config
  let rows = ["A","B","C","D","E"];
  let seatsPerRow = 8;
  let rowToCategory = { A:"VIP", B:"VIP", C:"Premium", D:"Normal", E:"Normal" };
  let prices = { VIP:350, Premium:220, Normal:150 };

  try {
    const th = await Theatre.findOne({ venue: { $regex: `^${venueName}$`, $options: "i" } }).lean();
    if (th) {
      const screen = (th.screens || []).find(s => s.name.toLowerCase() === screenName.toLowerCase());
      if (screen && screen.layout) {
        rows = screen.layout.rows || rows;
        seatsPerRow = screen.layout.seatsPerRow || seatsPerRow;
        rowToCategory = Object.fromEntries(Object.entries(screen.layout.rowToCategory || {}));
        prices = Object.fromEntries(Object.entries(screen.layout.prices || {}));
      }
    }

    // generate seats using rows & seatsPerRow
    const seats = [];
    rows.forEach(r => {
      for (let i = 1; i <= seatsPerRow; i++) seats.push(`${r}${i}`);
    });

    // fetch bookings for show
    const bookedDocs = await Booking.find({ show: showId }).select("seat -_id").lean();
    const booked = bookedDocs.map(b => b.seat);

    res.json({ seats, booked, layout: { rows, seatsPerRow, rowToCategory, prices } });
  } catch (err) {
    res.status(500).json({ message: "Error generating seat map", error: err.message });
  }
});

// ====================== Seed Theatres (POST / GET) ======================
app.post("/api/seedTheatres", async (req, res) => {
  // Accept seed body or use default sample.
  const seed = req.body && Array.isArray(req.body) ? req.body : [
    {
      venue: "PVR Cinemas",
      location: "Chennai",
      image: "PVR.jpg",
      screens: [
        { name: "Screen 1 - Dolby", tags: ["Dolby"], timings: ["10:30 AM","1:15 PM","4:00 PM","7:30 PM"],
          layout: { rows:["A","B","C","D","E"], rowToCategory: { A:"VIP",B:"VIP",C:"Premium",D:"Normal",E:"Normal" }, seatsPerRow:8, prices:{ VIP:350, Premium:220, Normal:150 } }
        },
        { name: "Screen 2 - IMAX", tags: ["IMAX"], timings: ["11:00 AM","2:30 PM","6:15 PM","9:45 PM"], layout: { rows:["A","B","C","D"], rowToCategory:{ A:"VIP",B:"Premium",C:"Normal",D:"Normal" }, seatsPerRow:10, prices:{ VIP:400, Premium:250, Normal:160 } } },
        { name: "Screen 3 - Standard", tags: ["Standard"], timings: ["9:45 AM","12:40 PM","3:30 PM","6:45 PM"], layout:{ rows:["A","B","C","D","E"], rowToCategory:{ A:"VIP",B:"Premium",C:"Premium",D:"Normal",E:"Normal" }, seatsPerRow:8, prices:{ VIP:350, Premium:220, Normal:150 } } }
      ]
    },
    // other theatres...
  ];

  try {
    // Remove existing to avoid duplicates if you want a fresh seed
    await Theatre.deleteMany({});
    await Theatre.insertMany(seed);
    res.json({ message: "Theatres seeded", count: seed.length });
  } catch (err) {
    res.status(500).json({ message: "Seeding failed", error: err.message });
  }
});