import sequelize from "./config/db.js";
import { DataTypes } from "sequelize";

const Theatre = sequelize.define(
  "Theatre",
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    venue: DataTypes.TEXT
  },
  { tableName: "theatres", timestamps: false }
);

const Screen = sequelize.define(
  "Screen",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: DataTypes.TEXT,
    tags: DataTypes.ARRAY(DataTypes.TEXT),
    timings: DataTypes.ARRAY(DataTypes.TEXT),
    theatre_id: DataTypes.UUID
  },
  { tableName: "screens", timestamps: false }
);

async function run() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected");

    const theatres = await Theatre.findAll();
    console.log("🎭 Theatres found:", theatres.length);

    for (const t of theatres) {
      console.log("➡️ Seeding screens for:", t.venue);

      await Screen.create({
        theatre_id: t.id,
        name: `${t.venue} Main Screen`,
        tags: ["Dolby"],
        timings: ["10:00 AM", "1:00 PM", "4:00 PM"]
      });
    }

    console.log("🎉 Screens seeded successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeder failed:", err);
    process.exit(1);
  }
}

run();