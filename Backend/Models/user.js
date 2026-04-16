const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: DataTypes.STRING,
  email: {
    type: DataTypes.STRING,
    unique: true
  },
  password: DataTypes.TEXT
}, {
  tableName: "users",
  timestamps: false
});

User.beforeCreate(async user => {
  user.password = await bcrypt.hash(user.password, 10);
});

module.exports = User;