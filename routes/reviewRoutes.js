import express from "express";

import {
  createReview,
  getVehicleReviews,
  getMyReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getAllReviews,
} from "../controllers/reviewController.js";

import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

/*
====================================================
PUBLIC ROUTES
====================================================
*/

/*
GET /api/reviews/vehicle/:vehicleId

Anyone can view reviews for a vehicle.
*/

router.get("/vehicle/:vehicleId", getVehicleReviews);

/*
====================================================
AUTHENTICATED ROUTES
====================================================
*/

router.use(protect);

/*
====================================================
MY REVIEWS
====================================================
*/

/*
GET /api/reviews/my

Get reviews created by logged-in customer.
*/

router.get("/my", authorizeRoles("user", "customer"), getMyReviews);

/*
====================================================
CREATE REVIEW
====================================================
*/

/*
POST /api/reviews

Customer creates a review.
*/

router.post("/", authorizeRoles("user", "customer"), createReview);

/*
====================================================
GET SINGLE REVIEW
====================================================
*/

/*
GET /api/reviews/:id
*/

router.get("/:id", getReviewById);

/*
====================================================
UPDATE REVIEW
====================================================
*/

/*
PUT /api/reviews/:id

Customer can update their own review.
*/

router.put("/:id", authorizeRoles("user", "customer"), updateReview);

/*
====================================================
DELETE REVIEW
====================================================
*/

/*
DELETE /api/reviews/:id

Customer can delete their own review.
*/

router.delete("/:id", authorizeRoles("user", "customer"), deleteReview);

/*
====================================================
ADMIN ROUTES
====================================================
*/

/*
GET /api/reviews/admin/all

Admin can view all reviews.
*/

router.get("/admin/all", authorizeRoles("admin"), getAllReviews);

export default router;
