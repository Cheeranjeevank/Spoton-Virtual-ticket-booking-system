// Backend/models/Theatre.js (PostgreSQL Version)

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/* ====================== THEATRE ====================== */
export const Theatre = sequelize.define("Theatre", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  venue: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  location: DataTypes.STRING,
  image: DataTypes.STRING
}, {
  tableName: "theatres",
  timestamps: false
});

/* ====================== SCREEN ====================== */
export const Screen = sequelize.define("Screen", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING)
  },
  timings: {
    type: DataTypes.ARRAY(DataTypes.STRING)
  }
}, {
  tableName: "screens",
  timestamps: false
});

/* ====================== SEAT CATEGORY ====================== */
export const SeatCategory = sequelize.define("SeatCategory", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  row_name: {
    type: DataTypes.STRING(5)
  },
  category: {
    type: DataTypes.STRING
  },
  price: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: "seat_categories",
  timestamps: false
});

/* ====================== RELATIONSHIPS ====================== */
Theatre.hasMany(Screen, { foreignKey: "theatre_id", onDelete: "CASCADE" });
Screen.belongsTo(Theatre, { foreignKey: "theatre_id" });

Screen.hasMany(SeatCategory, { foreignKey: "screen_id", onDelete: "CASCADE" });
SeatCategory.belongsTo(Screen, { foreignKey: "screen_id" });