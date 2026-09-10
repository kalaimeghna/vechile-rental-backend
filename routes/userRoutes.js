import express from "express";

import {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getAllUsers,
  getUserById,
  updateUser,
  activateUser,
  deactivateUser,
  deleteUser,
  getUserStatistics,
  getUserBookings,
  getUserVehicles,
  getMyStatistics,
  adminResetPassword,
} from "../controllers/userController.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

/*
====================================================
ALL USER ROUTES REQUIRE LOGIN
====================================================
*/

router.use(protect);

/*
====================================================
MY PROFILE
====================================================
*/

/*
GET /api/users/me
*/

router.get("/me", getMyProfile);

/*
PUT /api/users/me
*/

router.put("/me", updateMyProfile);

/*
====================================================
MY STATISTICS
====================================================
*/

/*
GET /api/users/me/statistics
*/

router.get("/me/statistics", getMyStatistics);

/*
====================================================
CHANGE PASSWORD
====================================================
*/

/*
PUT /api/users/change-password
*/

router.put("/change-password", changePassword);

/*
====================================================
ADMIN - USER STATISTICS
====================================================
*/

/*
GET /api/users/statistics
*/

router.get("/statistics", authorizeRoles("admin"), getUserStatistics);

/*
====================================================
ADMIN - ALL USERS
====================================================
*/

/*
GET /api/users
*/

router.get("/", authorizeRoles("admin"), getAllUsers);

/*
====================================================
ADMIN - USER BOOKINGS
====================================================
*/

/*
GET /api/users/:id/bookings
*/

router.get("/:id/bookings", authorizeRoles("admin"), getUserBookings);

/*
====================================================
ADMIN - USER VEHICLES
====================================================
*/

/*
GET /api/users/:id/vehicles
*/

router.get("/:id/vehicles", authorizeRoles("admin"), getUserVehicles);

/*
====================================================
ADMIN - RESET PASSWORD
====================================================
*/

/*
PUT /api/users/:id/reset-password
*/

router.put("/:id/reset-password", authorizeRoles("admin"), adminResetPassword);

/*
====================================================
ADMIN - UPDATE USER
====================================================
*/

/*
PUT /api/users/:id
*/

router.put("/:id", authorizeRoles("admin"), updateUser);

/*
====================================================
ADMIN - ACTIVATE USER
====================================================
*/

/*
PUT /api/users/:id/activate
*/

router.put("/:id/activate", authorizeRoles("admin"), activateUser);

/*
====================================================
ADMIN - DEACTIVATE USER
====================================================
*/

/*
PUT /api/users/:id/deactivate
*/

router.put("/:id/deactivate", authorizeRoles("admin"), deactivateUser);

/*
====================================================
ADMIN - DELETE USER
====================================================
*/

/*
DELETE /api/users/:id
*/

router.delete("/:id", authorizeRoles("admin"), deleteUser);

/*
====================================================
GET USER BY ID
====================================================
*/

/*
GET /api/users/:id

This is intentionally placed LAST because
/:id is a dynamic route.
*/

router.get("/:id", getUserById);

export default router;
