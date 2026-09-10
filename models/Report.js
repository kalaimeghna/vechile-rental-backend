import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },

    subject: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "reviewing", "resolved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

const Report = mongoose.model("Report", reportSchema);

export default Report;
