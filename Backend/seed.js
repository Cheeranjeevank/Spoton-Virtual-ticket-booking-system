// ===========================================================
// seed.js — PostgreSQL Theatre Seeder for SpotOn (FINAL)
// ===========================================================

import dotenv from "dotenv";
import sequelize from "./config/db.js";
import { DataTypes } from "sequelize";

dotenv.config();

/* ====================== MODELS ====================== */

// ---------- Theatre ----------
const Theatre = sequelize.define("Theatre", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  venue: { type: DataTypes.STRING, unique: true },
  location: DataTypes.STRING,
  image: DataTypes.STRING
}, { tableName: "theatres", timestamps: false });

// ---------- Screen ----------
const Screen = sequelize.define("Screen", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: DataTypes.STRING,
  tags: DataTypes.ARRAY(DataTypes.TEXT),
  timings: DataTypes.ARRAY(DataTypes.TEXT)
}, { tableName: "screens", timestamps: false });

// ---------- Seat Category ----------
const SeatCategory = sequelize.define("SeatCategory", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  row_name: DataTypes.STRING,
  category: DataTypes.STRING,
  price: DataTypes.INTEGER
}, { tableName: "seat_categories", timestamps: false });

// Relations
Theatre.hasMany(Screen, { foreignKey: "theatre_id" });
Screen.belongsTo(Theatre, { foreignKey: "theatre_id" });

Screen.hasMany(SeatCategory, { foreignKey: "screen_id" });
SeatCategory.belongsTo(Screen, { foreignKey: "screen_id" });

/* ====================== SEED DATA ====================== */

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
          rowToCategory: { A: "VIP", B: "VIP", C: "Premium", D: "Normal", E: "Normal" },
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
          rowToCategory: { A: "VIP", B: "Premium", C: "Normal", D: "Normal" },
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
          rowToCategory: { A: "VIP", B: "Premium", C: "Normal", D: "Normal" },
          seatsPerRow: 8,
          prices: { VIP: 330, Premium: 210, Normal: 150 }
        }
      }
    ]
  }
];

/* ====================== RUN SEEDER ====================== */

async function run() {
  try {
    console.log("🔌 Connecting to PostgreSQL...");
    await sequelize.authenticate();

    console.log("🧹 Clearing old data...");
    await SeatCategory.destroy({ where: {} });
    await Screen.destroy({ where: {} });
    await Theatre.destroy({ where: {} });

    console.log("🌱 Seeding theatres...");

    for (const theatreData of seedData) {
      const theatre = await Theatre.create({
        venue: theatreData.venue,
        location: theatreData.location,
        image: theatreData.image
      });

      for (const screenData of theatreData.screens) {
        const screen = await Screen.create({
          theatre_id: theatre.id,
          name: screenData.name,
          tags: screenData.tags,
          timings: screenData.timings
        });

        // Convert layout → seat_categories
        for (const row of screenData.layout.rows) {
          const category = screenData.layout.rowToCategory[row];
          const price = screenData.layout.prices[category];

          await SeatCategory.create({
            screen_id: screen.id,
            row_name: row,
            category,
            price
          });
        }
      }
    }

    console.log("✅ PostgreSQL seeding completed successfully!");
  } catch (err) {
    console.error("❌ Seeder error:", err);
  } finally {
    await sequelize.close();
  }
}

run();