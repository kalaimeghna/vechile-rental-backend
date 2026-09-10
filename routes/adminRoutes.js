import express from "express";

import {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getAllVehicles,
  getVehicleById,
  updateVehicleStatus,
  deleteVehicle,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  getAllPayments,
  getPaymentById,
  getAllReviews,
  deleteReview,
  getReports,
} from "../controllers/adminController.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

/*
====================================================
ADMIN AUTHORIZATION
====================================================
*/

/*
All admin routes require:
1. Login
2. Admin role
*/

router.use(protect);
router.use(authorizeRoles("admin"));

/*
====================================================
DASHBOARD
====================================================
*/

/*
GET /api/admin/dashboard
*/

router.get("/dashboard", getDashboardStats);

/*
====================================================
USERS
====================================================
*/

/*
GET /api/admin/users
*/

router.get("/users", getAllUsers);

/*
GET /api/admin/users/:id
*/

router.get("/users/:id", getUserById);

/*
PUT /api/admin/users/:id/status
*/

router.put("/users/:id/status", updateUserStatus);

/*
DELETE /api/admin/users/:id
*/

router.delete("/users/:id", deleteUser);

/*
====================================================
VEHICLES
====================================================
*/

/*
GET /api/admin/vehicles
*/

router.get("/vehicles", getAllVehicles);

/*
GET /api/admin/vehicles/:id
*/

router.get("/vehicles/:id", getVehicleById);

/*
PUT /api/admin/vehicles/:id/status
*/

router.put("/vehicles/:id/status", updateVehicleStatus);

/*
DELETE /api/admin/vehicles/:id
*/

router.delete("/vehicles/:id", deleteVehicle);

/*
====================================================
BOOKINGS
====================================================
*/

/*
GET /api/admin/bookings
*/

router.get("/bookings", getAllBookings);

/*
GET /api/admin/bookings/:id
*/

router.get("/bookings/:id", getBookingById);

/*
PUT /api/admin/bookings/:id/status
*/

router.put("/bookings/:id/status", updateBookingStatus);

/*
====================================================
PAYMENTS
====================================================
*/

/*
GET /api/admin/payments
*/

router.get("/payments", getAllPayments);

/*
GET /api/admin/payments/:id
*/

router.get("/payments/:id", getPaymentById);

/*
====================================================
REVIEWS
====================================================
*/

/*
GET /api/admin/reviews
*/

router.get("/reviews", getAllReviews);

/*
DELETE /api/admin/reviews/:id
*/

router.delete("/reviews/:id", deleteReview);

/*
====================================================
REPORTS
====================================================
*/

/*
GET /api/admin/reports
*/

router.get("/reports", getReports);

export default router;
