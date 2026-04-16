import sequelize from "./config/db.js";

sequelize.authenticate()
  .then(() => console.log("✅ Connected to PostgreSQL!"))
  .catch(err => console.error("❌ PostgreSQL connection error:", err));