const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./user");
// Before saving booking
const exists = await Booking.findOne({ show, seat });
if (exists) {
  return res.status(409).json({ msg: "Seat already booked" });
}

const Booking = sequelize.define("Booking", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  seat: DataTypes.STRING,
  show_name: DataTypes.STRING
}, {
  tableName: "bookings",
  createdAt: "booked_at",
  updatedAt: false
});

User.hasMany(Booking, { foreignKey: "user_id" });
Booking.belongsTo(User, { foreignKey: "user_id" });

module.exports = Booking;