import mongoose from "mongoose";
import env from "./env.js";

const connectDB = async () => {
  try {
    if (!env.mongoUri) {
      throw new Error("MONGO_URI is not defined in .env");
    }

    const connection = await mongoose.connect(env.mongoUri);

    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
