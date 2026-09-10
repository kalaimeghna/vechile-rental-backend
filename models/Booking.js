import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    pickupLocation: {
      type: String,
      required: true,
    },

    returnLocation: {
      type: String,
      required: true,
    },

    numberOfDays: {
      type: Number,
      required: true,
    },

    pricePerDay: {
      type: Number,
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "ongoing",
        "completed",
        "cancelled",
        "rejected",
      ],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
