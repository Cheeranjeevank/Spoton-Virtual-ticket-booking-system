import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import QRCode from "qrcode";
//import Razorpay from "razorpay";
import sequelize from "./config/db.js";
import { DataTypes, Op } from "sequelize";

dotenv.config();
const app = express();

/* ====================== MIDDLEWARE ====================== */
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));

/* ====================== MODELS ====================== */
// ---------- Theatre ----------
const Theatre = sequelize.define("Theatre", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  venue: { type: DataTypes.TEXT, unique: true },
  location: DataTypes.TEXT,
  image: DataTypes.TEXT
}, { tableName: "theatres", timestamps: false });

// ---------- Screen ----------
const Screen = sequelize.define("Screen", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.TEXT,
  tags: DataTypes.ARRAY(DataTypes.TEXT),
  timings: DataTypes.ARRAY(DataTypes.TEXT)
}, { tableName: "screens", timestamps: false });

Theatre.hasMany(Screen, { foreignKey: "theatre_id" });
Screen.belongsTo(Theatre, { foreignKey: "theatre_id" });

// ---------- User ----------
const User = sequelize.define("User", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.TEXT,
  email: { type: DataTypes.TEXT, unique: true },
  password: DataTypes.TEXT,
  dob: { type: DataTypes.DATE, allowNull: false },
  role: { type: DataTypes.TEXT, defaultValue: "user" }
}, { tableName: "users", timestamps: false });

// ---------- Booking ----------
const Booking = sequelize.define("Booking", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  seat: DataTypes.TEXT,
  show: DataTypes.TEXT,
  status: { type: DataTypes.TEXT, defaultValue: "PENDING" }
}, { tableName: "bookings", timestamps: true, updatedAt: false });

User.hasMany(Booking, { foreignKey: "user_id" });
Booking.belongsTo(User, { foreignKey: "user_id" });

// ---------- Seat Lock ----------
const SeatLock = sequelize.define("SeatLock", {
  show: DataTypes.TEXT,
  seat: DataTypes.TEXT,
  expires_at: DataTypes.DATE
}, { tableName: "seat_locks", timestamps: false });

// ---------- Contact ----------
const Message = sequelize.define("Message", {
  name: DataTypes.TEXT,
  email: DataTypes.TEXT,
  message: DataTypes.TEXT
}, { tableName: "messages", timestamps: true, createdAt: "created_at", updatedAt: false });
const Payment = sequelize.define("Payment", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  booking_id: DataTypes.UUID,
  razorpay_payment_id: DataTypes.TEXT,
  razorpay_order_id: DataTypes.TEXT,
  amount: DataTypes.INTEGER,
  status: { type: DataTypes.TEXT, defaultValue: "PAID" }
}, {
  tableName: "payments",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false
});
/* ====================== EXPORT USERS (SEQUELIZE) ====================== */
app.get("/api/export/users", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "email", "dob"],
      order: [["id", "ASC"]]
    });

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to export users" });
  }
});
/* ====================== AUTH MIDDLEWARE ====================== */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "Token missing" });

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch {
    res.status(403).json({ message: "Invalid token" });
  }
}


function staffOnly(req, res, next) {
  if (!["staff", "admin"].includes(req.userRole))
    return res.status(403).json({ message: "Staff/Admin only" });
  next();
}

/* ====================== AUTH ====================== */
app.post("/api/signup", async (req, res) => {
  const { name, email, password, dob } = req.body;

  function calculateAge(dob) {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  if (!dob || calculateAge(dob) < 18) {
    return res.status(400).json({
      message: "You must be at least 18 years old to register."
    });
  }

  if (!password || password.length < 6)
    return res.status(400).json({ message: "Password too short" });

  if (await User.findOne({ where: { email } }))
    return res.status(400).json({ message: "Email exists" });

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hashed, dob });

  res.json({ message: "Signup successful" });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(400).json({ message: "User not found" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.json({ token, user: { name: user.name, role: user.role } });
});

/* ====================== ADMIN / STAFF MGMT ====================== */
app.post("/api/admin/promote", async (req, res) => {
  const { email, role } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = role || "staff";
    await user.save();

    res.json({ message: `User ${email} promoted to ${user.role}` });
  } catch (err) {
    res.status(500).json({ message: "Promotion failed" });
  }
});

/* ====================== BOOKINGS ====================== */
app.get("/api/bookings", auth, async (req, res) => {
  const bookings = await Booking.findAll({
    where: { user_id: req.user },
    order: [["createdAt", "DESC"]]
  });
  res.json(bookings);
});

/* ====================== SEAT LOCK ====================== */
app.post("/api/seats/lock", auth, async (req, res) => {
  const { show, seat } = req.body;
  const expires = new Date(Date.now() + 5 * 60 * 1000);

  const exists =
    await Booking.findOne({ where: { show, seat } }) ||
    await SeatLock.findOne({ where: { show, seat } });

  if (exists) return res.status(400).json({ message: "Seat unavailable" });

  await SeatLock.create({ show, seat, expires_at: expires });
  io.emit("seatLocked", { show, seat });

  res.json({ message: "Seat locked", expires });
});

app.delete("/api/seats/unlock", auth, async (req, res) => {
  const { show, seat } = req.body;
  await SeatLock.destroy({ where: { show, seat } });
  io.emit("seatUnlocked", { show, seat });
  res.json({ message: "Seat unlocked" });
});

/* ====================== MULTI-SEAT BOOKING ====================== */
app.post("/api/bookings/multi", auth, async (req, res) => {
  const { show, seats } = req.body;
  const t = await sequelize.transaction();

  try {
    const conflict = await Booking.findOne({
      where: {
        show,
        seat: { [Op.in]: seats }
      },
      transaction: t
    });
    if (conflict) throw new Error("Seat already booked");

    await Booking.bulkCreate(
      seats.map(s => ({ show, seat: s, user_id: req.user })),
      { transaction: t }
    );

    const createdBookings = await Booking.findAll({
      where: {
        show,
        seat: { [Op.in]: seats },
        user_id: req.user
      },
      transaction: t
    });

    await SeatLock.destroy({ where: { show, seat: seats }, transaction: t });
    await t.commit();

    seats.forEach(seat => io.emit("bookingCreated", { show, seat }));
    res.json({ message: "Booking successful", booking: createdBookings });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ message: err.message });
  }
});

/* ====================== PAYMENT ====================== */
app.post("/api/payment/mock", auth, async (req, res) => {
  const { bookingIds } = req.body;

  await Booking.update(
    { status: "PAID" },
    { where: { id: bookingIds, user_id: req.user } }
  );

  res.json({ message: "Payment successful" });
});

/* ====================== PAYMENT STORE ====================== */
app.post("/api/payment/store", auth, async (req, res) => {
  const { bookingIds, razorpay_payment_id, razorpay_order_id, amount } = req.body;

  try {
    const payments = await Promise.all(
      bookingIds.map(bid =>
        Payment.create({
          booking_id: bid,
          razorpay_payment_id: razorpay_payment_id || "mock_" + Date.now(),
          razorpay_order_id: razorpay_order_id || "mock_order",
          amount: amount || 0,
          status: "PAID"
        })
      )
    );

    // Also mark bookings as paid
    await Booking.update(
      { status: "PAID" },
      { where: { id: bookingIds, user_id: req.user } }
    );

    res.json({ message: "Payment stored", payments });
  } catch (err) {
    console.error("Payment store error:", err);
    res.status(500).json({ message: "Failed to store payment" });
  }
});

/* ====================== QR TICKET ====================== */
app.get("/api/ticket/:id", auth, async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking || booking.user_id !== req.user)
      return res.status(403).json({ message: "Not allowed" });

    if (booking.status !== "PAID")
      return res.status(400).json({ message: "Ticket not paid" });

    // Group bookings (same user, show, and within 30s window)
    const windowStart = new Date(new Date(booking.createdAt).getTime() - 30000);
    const windowEnd = new Date(new Date(booking.createdAt).getTime() + 30000);

    const related = await Booking.findAll({
      where: {
        user_id: req.user,
        show: booking.show,
        createdAt: { [Op.between]: [windowStart, windowEnd] }
      }
    });

    const seats = related.map(b => b.seat).join(", ");
    const showParts = booking.show.split(" | ");
    const movie = showParts[0] || "SpotOn Movie";
    const venue = showParts[1] || "";
    const screen = showParts[2] || "";

    const qrData = {
      id: booking.id,
      movie,
      venue,
      screen,
      seats: related.map(b => b.seat)
    };

    // Use Host header for dynamic public URL
    const host = req.headers.host || "localhost:5507";
    const protocol = host.includes("localhost") ? "http" : "https";
    const publicUrl = `${protocol}://${host}/check.html?id=${booking.id}`;

    const qr = await QRCode.toDataURL(publicUrl);
    res.json({ qr, seats });
  } catch (err) {
    console.error("QR Error:", err);
    res.status(500).json({ message: "QR generation failed" });
  }
});

/* ====================== PUBLIC TICKET VIEW ====================== */
app.get("/api/ticket/public/:id", async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ message: "Ticket not found" });

    // Group associated seats (30s window, same show, same user)
    const windowStart = new Date(new Date(booking.createdAt).getTime() - 30000);
    const windowEnd = new Date(new Date(booking.createdAt).getTime() + 30000);

    const related = await Booking.findAll({
      where: {
        user_id: booking.user_id,
        show: booking.show,
        createdAt: { [Op.between]: [windowStart, windowEnd] }
      }
    });

    const showParts = booking.show.split(" | ");
    res.json({
      id: booking.id,
      movie: showParts[0] || "SpotOn Movie",
      venue: showParts[1] || "",
      screen: showParts[2] || "",
      date: showParts[3] || "",
      time: showParts[4] || "",
      seats: related.map(b => b.seat).join(", "),
      status: booking.status
    });
  } catch (err) {
    console.error("Public Ticket Error:", err);
    res.status(500).json({ message: "Failed to load ticket details" });
  }
});

/* ====================== STAFF VERIFY ====================== */
app.post("/api/ticket/verify", auth, staffOnly, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const target = await Booking.findByPk(bookingId);

    if (!target) return res.status(404).json({ message: "Invalid ticket" });
    if (target.status !== "PAID" && target.status !== "USED")
      return res.status(400).json({ message: "Ticket not valid" });

    // Group associated seats (30s window)
    const windowStart = new Date(new Date(target.createdAt).getTime() - 30000);
    const windowEnd = new Date(new Date(target.createdAt).getTime() + 30000);

    const related = await Booking.findAll({
      where: {
        user_id: target.user_id,
        show: target.show,
        createdAt: { [Op.between]: [windowStart, windowEnd] }
      }
    });

    // Mark all as USED
    await Booking.update(
      { status: "USED" },
      {
        where: {
          id: related.map(r => r.id)
        }
      }
    );

    res.json({
      message: "Ticket Verified Successfully",
      movie: target.show.split(" | ")[0],
      seats: related.map(r => r.seat).join(", "),
      count: related.length,
      status: "USED"
    });
  } catch (err) {
    console.error("Verify Error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
});

/* ====================== CONTACT ====================== */
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;
  await Message.create({ name, email, message });
  res.json({ message: "Message received" });
});

/* ====================== STATIC ====================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../frontend")));

/* ====================== SERVER ====================== */
const PORT = process.env.PORT || 5507;
const server = app.listen(PORT, async () => {
  await sequelize.authenticate();
  await sequelize.sync(); // 🔥 ensures seat_locks table is created
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

const io = new Server(server, { cors: { origin: true } });
io.on("connection", s => console.log("🟢 Socket connected:", s.id));
// ====================== THEATRES ======================
app.get("/api/theatres", async (req, res) => {
  try {
    const theatres = await Theatre.findAll({
      attributes: ["venue", "location", "image"]
    });

    // 🔁 Map DB fields → frontend format
    const formatted = theatres.map(t => ({
      name: t.venue,
      location: t.location,
      image: t.image
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching theatres:", err);
    res.status(500).json({ message: "Failed to load theatres" });
  }
});
// ====================== SHOW TIMES (PostgreSQL) ======================
app.get("/api/showdata/:venue", async (req, res) => {
  try {
    const venueName = decodeURIComponent(req.params.venue || "").trim();

    // 1️⃣ Find theatre
    const theatre = await Theatre.findOne({
      where: { venue: venueName }
    });

    if (!theatre) {
      return res.json({});
    }

    // 2️⃣ Get screens for theatre
    const screens = await Screen.findAll({
      where: { theatre_id: theatre.id },
      attributes: ["name", "timings"]
    });

    // 3️⃣ Convert to frontend format
    const result = {};
    screens.forEach(s => {
      result[s.name] = s.timings || [];
    });

    res.json(result);

  } catch (err) {
    console.error("Showdata error:", err);
    res.status(500).json({ message: "Failed to load show timings" });
  }
});
app.get("/api/seats/:showId", async (req, res) => {
  try {
    const showId = decodeURIComponent(req.params.showId);

    const bookedRows = await Booking.findAll({
      where: { show: showId },
      attributes: ["seat"]
    });

    const lockedRows = await SeatLock.findAll({
      where: {
        show: showId,
        expires_at: { [Op.gt]: new Date() }
      },
      attributes: ["seat"]
    });

    const booked = bookedRows.map(b => b.seat);
    const locked = lockedRows.map(l => l.seat);

    // Seat layout (matches frontend)
    const rows = ["A", "B", "C", "D", "E"];
    const seatsPerRow = 8;

    const seats = [];
    rows.forEach(r => {
      for (let i = 1; i <= seatsPerRow; i++) {
        seats.push(`${r}${i}`);
      }
    });

    res.json({
      seats,
      booked,
      locked
    });

  } catch (err) {
    console.error("Seat map error:", err);
    res.status(500).json({ message: "Failed to load seats" });
  }
});
