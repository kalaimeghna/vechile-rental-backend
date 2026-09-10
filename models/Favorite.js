import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
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
  },
  {
    timestamps: true,
  },
);

favoriteSchema.index({ user: 1, vehicle: 1 }, { unique: true });

const Favorite = mongoose.model("Favorite", favoriteSchema);

export default Favorite;
