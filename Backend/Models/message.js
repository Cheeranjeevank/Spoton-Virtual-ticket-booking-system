const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Message = sequelize.define("Message", {
  name: DataTypes.STRING,
  email: DataTypes.STRING,
  message: DataTypes.TEXT
}, {
  tableName: "messages",
  createdAt: "created_at",
  updatedAt: false
});

module.exports = Message;