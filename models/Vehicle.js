import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    brand: {
      type: String,
      required: true,
      trim: true,
    },

    model: {
      type: String,
      required: true,
      trim: true,
    },

    year: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["car", "bike", "scooter", "van", "suv", "luxury"],
      required: true,
    },

    fuelType: {
      type: String,
      enum: ["petrol", "diesel", "electric", "hybrid"],
      required: true,
    },

    transmission: {
      type: String,
      enum: ["manual", "automatic"],
      required: true,
    },

    seats: {
      type: Number,
      required: true,
    },

    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },

    location: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    features: {
      type: [String],
      default: [],
    },

    images: {
      type: [String],
      default: [],
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    isApproved: {
      type: Boolean,
      default: true,
    },

    rating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

export default Vehicle;
