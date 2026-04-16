const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../Models/user");
const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(400).json({ msg: "Email exists" });

  const user = await User.create({ name, email, password });
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

  res.json({ msg: "Signup successful", token });
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(400).json({ msg: "User not found" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ msg: "Wrong password" });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
  res.json({ msg: "Login successful", token });
});

module.exports = router;
router.post("/booking", authMiddleware, async (req, res) => {
  const { seat, show } = req.body;

  try {
    const booking = await Booking.create({
      seat,
      show_name: show,
      user_id: req.user.id
    });

    res.json({ message: "Seat booked", bookingId: booking.id });
  } catch (err) {
    res.status(400).json({ message: "Seat already booked" });
  }
});
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("spoton_db", "postgres", "password", {
  host: "localhost",
  dialect: "postgres"
});

module.exports = sequelize;