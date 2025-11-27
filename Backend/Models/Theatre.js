// Backend/models/Theatre.js
import mongoose from "mongoose";

const LayoutSchema = new mongoose.Schema({
  rows: [String], // ["A","B",...]
  rowToCategory: { type: Map, of: String }, // { A: "VIP", B: "VIP", ... }
  seatsPerRow: Number,
  prices: { type: Map, of: Number } // { VIP: 350, Premium: 220, Normal: 150 }
}, { _id: false });

const ScreenSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tags: [String], // e.g. ["IMAX","Dolby"]
  timings: [String],
  layout: LayoutSchema
}, { _id: false });

const TheatreSchema = new mongoose.Schema({
  venue: { type: String, required: true, unique: true },
  location: String,
  image: String,
  screens: [ScreenSchema],
}, { timestamps: true });

export default mongoose.model("Theatre", TheatreSchema);