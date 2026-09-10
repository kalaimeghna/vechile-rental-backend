import express from "express";

import {
  createBooking,
  getMyBookings,
  getBookingById,
  getAllBookings,
  getOwnerBookings,
  updateBookingStatus,
  cancelBooking,
  deleteBooking,
} from "../controllers/bookingController.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

/*
====================================================
ALL BOOKING ROUTES REQUIRE LOGIN
====================================================
*/

router.use(protect);

/*
====================================================
CREATE BOOKING
====================================================
*/

/*
POST /api/bookings

Customer creates a new vehicle booking.
*/

router.post("/", authorizeRoles("user", "customer"), createBooking);

/*
====================================================
MY BOOKINGS
====================================================
*/

/*
GET /api/bookings/my

Get bookings belonging to logged-in customer.
*/

router.get("/my", authorizeRoles("user", "customer"), getMyBookings);

/*
====================================================
OWNER BOOKINGS
====================================================
*/

/*
GET /api/bookings/owner

Get bookings for vehicles owned by
the logged-in owner.
*/

router.get("/owner", authorizeRoles("owner"), getOwnerBookings);

/*
====================================================
ALL BOOKINGS
====================================================
*/

/*
GET /api/bookings

Admin can view all bookings.
*/

router.get("/", authorizeRoles("admin"), getAllBookings);

/*
====================================================
UPDATE BOOKING STATUS
====================================================
*/

/*
PUT /api/bookings/:id/status

Owner/Admin can update booking status.
*/

router.put(
  "/:id/status",
  authorizeRoles("owner", "admin"),
  updateBookingStatus,
);

/*
====================================================
CANCEL BOOKING
====================================================
*/

/*
PUT /api/bookings/:id/cancel

Customer can cancel their own booking.
*/

router.put("/:id/cancel", authorizeRoles("user", "customer"), cancelBooking);

/*
====================================================
GET SINGLE BOOKING
====================================================
*/

/*
GET /api/bookings/:id

Get booking details.
*/

router.get("/:id", getBookingById);

/*
====================================================
DELETE BOOKING
====================================================
*/

/*
DELETE /api/bookings/:id

Admin can delete a booking.
*/

router.delete("/:id", authorizeRoles("admin"), deleteBooking);

export default router;
