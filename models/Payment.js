import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "online"],
      required: true,
    },

    transactionId: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
