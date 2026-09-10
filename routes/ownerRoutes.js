import express from "express";

import {
  getOwnerDashboard,
  getOwnerProfile,
  updateOwnerProfile,
  getOwnerVehicles,
  getOwnerVehicleById,
  getOwnerBookings,
  getOwnerEarnings,
  getOwnerStatistics,
} from "../controllers/ownerController.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

/*
====================================================
OWNER AUTHENTICATION
====================================================
*/

/*
All owner routes require:
1. Login
2. Owner role
*/

router.use(protect);
router.use(authorizeRoles("owner"));

/*
====================================================
OWNER DASHBOARD
====================================================
*/

/*
GET /api/owners/dashboard
*/

router.get("/dashboard", getOwnerDashboard);

/*
====================================================
OWNER PROFILE
====================================================
*/

/*
GET /api/owners/profile
*/

router.get("/profile", getOwnerProfile);

/*
PUT /api/owners/profile
*/

router.put("/profile", updateOwnerProfile);

/*
====================================================
OWNER VEHICLES
====================================================
*/

/*
GET /api/owners/vehicles

Get all vehicles belonging to logged-in owner.
*/

router.get("/vehicles", getOwnerVehicles);

/*
GET /api/owners/vehicles/:id

Get one vehicle belonging to logged-in owner.
*/

router.get("/vehicles/:id", getOwnerVehicleById);

/*
====================================================
OWNER BOOKINGS
====================================================
*/

/*
GET /api/owners/bookings

Get bookings for owner's vehicles.
*/

router.get("/bookings", getOwnerBookings);

/*
====================================================
OWNER EARNINGS
====================================================
*/

/*
GET /api/owners/earnings
*/

router.get("/earnings", getOwnerEarnings);

/*
====================================================
OWNER STATISTICS
====================================================
*/

/*
GET /api/owners/statistics
*/

router.get("/statistics", getOwnerStatistics);

export default router;
