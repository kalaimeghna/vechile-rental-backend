import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import connectDB from "./config/db.js";
import env from "./config/env.js";

import authRoutes from "./routes/authRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import contactRoutes from "./routes/contactRoutes.js"; // 1. Import contact routes

import notFound from "./middleware/notFoundMiddleware.js";
import errorHandler from "./middleware/errorMiddleware.js";

const app = express();

connectDB();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);

app.use(helmet());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Vehicle Rental Platform API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api", contactRoutes); // 2. Mount contact routes under /api prefix

app.use(notFound);
app.use(errorHandler);

const PORT = env.port;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
