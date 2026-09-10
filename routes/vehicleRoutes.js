import express from "express";

import {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getMyVehicles,
} from "../controllers/vehicleController.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getVehicles);

router.get("/my", protect, authorizeRoles("owner", "admin"), getMyVehicles);

router.get("/:id", getVehicleById);

router.post("/", protect, authorizeRoles("owner", "admin"), createVehicle);

router.put("/:id", protect, authorizeRoles("owner", "admin"), updateVehicle);

router.delete("/:id", protect, authorizeRoles("owner", "admin"), deleteVehicle);

export default router;
