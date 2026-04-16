import sequelize from "./config/db.js";
import { DataTypes } from "sequelize";

const Theatre = sequelize.define("Theatre", {
  id: { type: DataTypes.UUID, primaryKey: true },
  venue: DataTypes.TEXT
}, { tableName: "theatres", timestamps: false });

const Screen = sequelize.define("Screen", {
  name: DataTypes.TEXT,
  tags: DataTypes.ARRAY(DataTypes.TEXT),
  timings: DataTypes.ARRAY(DataTypes.TEXT)
}, { tableName: "screens", timestamps: false });

async function run() {
  const theatre = await Theatre.findOne({
    where: { venue: "PVR Cinemas" }
  });

  if (!theatre) {
    console.error("❌ Theatre 'PVR Cinemas' not found in DB");
    process.exit(1);
  }

  await Screen.bulkCreate([
    {
      theatre_id: theatre.id,
      name: "Screen 1 - Dolby",
      tags: ["Dolby"],
      timings: ["10:30 AM","1:15 PM","4:00 PM","7:30 PM"]
    },
    {
      theatre_id: theatre.id,
      name: "Screen 2 - IMAX",
      tags: ["IMAX"],
      timings: ["11:00 AM","2:30 PM","6:15 PM","9:45 PM"]
    }
  ]);

  console.log("✅ Screens seeded successfully");
  process.exit();
}

run();