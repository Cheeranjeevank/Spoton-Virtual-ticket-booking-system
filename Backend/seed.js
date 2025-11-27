// seed.js — Standalone Theatre Seeder for SpotOn

import mongoose from "mongoose";
import dotenv from "dotenv";
import Theatre from "./Models/Theatre.js";

dotenv.config();

// ------------------ FULL SEED DATA ------------------
const seedData = [
  {
    venue: "PVR Cinemas",
    location: "Chennai",
    image: "PVR.jpg",
    screens: [
      {
        name: "Screen 1 - Dolby",
        tags: ["Dolby"],
        timings: ["10:30 AM", "1:15 PM", "4:00 PM", "7:30 PM"],
        layout: {
          rows: ["A", "B", "C", "D", "E"],
          rowToCategory: {
            A: "VIP",
            B: "VIP",
            C: "Premium",
            D: "Normal",
            E: "Normal"
          },
          seatsPerRow: 10,
          prices: { VIP: 350, Premium: 220, Normal: 150 }
        }
      },
      {
        name: "Screen 2 - IMAX",
        tags: ["IMAX"],
        timings: ["11:00 AM", "2:30 PM", "6:15 PM", "9:45 PM"],
        layout: {
          rows: ["A", "B", "C", "D"],
          rowToCategory: {
            A: "VIP",
            B: "Premium",
            C: "Normal",
            D: "Normal"
          },
          seatsPerRow: 12,
          prices: { VIP: 400, Premium: 250, Normal: 160 }
        }
      }
    ]
  },

  {
    venue: "INOX City Center",
    location: "Coimbatore",
    image: "INOX.jpeg",
    screens: [
      {
        name: "Screen A",
        tags: ["Dolby"],
        timings: ["10:00 AM", "1:00 PM", "4:00 PM"],
        layout: {
          rows: ["A", "B", "C", "D"],
          rowToCategory: {
            A: "VIP",
            B: "Premium",
            C: "Normal",
            D: "Normal"
          },
          seatsPerRow: 8,
          prices: { VIP: 330, Premium: 210, Normal: 150 }
        }
      }
    ]
  },
  {
    venue: "Sathyam Cinemas",
    location: "Madurai",
    image: "SATHYAM.png",
    screens: [
      {
        name: "AUDI 1",
        tags: ["Dolby"],
        timings: ["9:30 AM", "12:30 PM", "3:30 PM", "6:30 PM"],
        layout: {
          rows: ["A", "B", "C", "D", "E", "F"],
          rowToCategory: { "A": "VIP", "B": "VIP", "C": "Premium", "D": "Premium", "E": "Normal", "F": "Normal" },
          seatsPerRow: 9,
          prices: { "VIP": 360, "Premium": 240, "Normal": 160 }
        }
      },
      {
        name: "AUDI 2",
        tags: ["Standard"],
        timings: ["10:00 AM", "1:00 PM", "4:00 PM", "7:00 PM"],
        layout: {
          rows: ["A", "B", "C", "D", "E"],
          rowToCategory: { "A": "VIP", "B": "Premium", "C": "Premium", "D": "Normal", "E": "Normal" },
          seatsPerRow: 10,
          prices: { "VIP": 340, "Premium": 230, "Normal": 150 }
        }
      },
      {
        name: "AUDI 3",
        tags: ["Standard"],
        timings: ["11:00 AM", "2:00 PM", "5:00 PM", "8:00 PM"],
        layout: {
          rows: ["A", "B", "C", "D"],
          rowToCategory: { "A": "VIP", "B": "Premium", "C": "Normal", "D": "Normal" },
          seatsPerRow: 8,
          prices: { "VIP": 330, "Premium": 200, "Normal": 150 }
        }
      }
    ]
  },
  {
    venue: "Luxe IMAX",
    location: "Bangalore",
    image: "IMAX.jpeg",
    screens: [
      {
        name: "IMAX Blue",
        tags: ["IMAX"],
        timings: ["10:15 AM", "1:20 PM", "4:25 PM", "7:30 PM"],
        layout: {
          rows: ["A", "B", "C", "D"],
          rowToCategory: { "A": "VIP", "B": "Premium", "C": "Premium", "D": "Normal" },
          seatsPerRow: 12,
          prices: { "VIP": 450, "Premium": 260, "Normal": 170 }
        }
      },
      {
        name: "IMAX Red",
        tags: ["IMAX"],
        timings: ["11:10 AM", "2:45 PM", "6:10 PM", "9:30 PM"],
        layout: {
          rows: ["A", "B", "C", "D"],
          rowToCategory: { "A": "VIP", "B": "Premium", "C": "Premium", "D": "Normal" },
          seatsPerRow: 12,
          prices: { "VIP": 450, "Premium": 260, "Normal": 170 }
        }
      }
    ]
  }
];

// ------------------ RUN SEEDER ------------------
async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Clearing old theatres...");
    await Theatre.deleteMany({});

    console.log("Inserting new theatres...");
    await Theatre.insertMany(seedData);

    console.log("✅ Seeding complete.");
  } catch (err) {
    console.error("❌ Seeder error:", err);
  } finally {
    mongoose.connection.close();
  }
}

run();