const express = require("express");
const Message = require("../Models/message");
const router = express.Router();

router.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;
  try {
    const msg = new Message({ name, email, message });
    await msg.save();
    res.json({ msg: "Message received successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;